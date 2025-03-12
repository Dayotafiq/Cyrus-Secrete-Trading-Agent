import psycopg2
from psycopg2.extras import Json
import logging
import json
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
import bcrypt
from datetime import datetime

logging.basicConfig(filename="cosmos_trading_agent.log", level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def get_db_connection():
    try:
        return psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASSWORD,
            connect_timeout=5
        )
    except psycopg2.Error as e:
        logging.error(json.dumps({"event": "db_connection_failed", "error": str(e)}))
        raise

def create_user(wallet_address, wallet_seed, total_capital, default_indicators=None, default_weights=None):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT user_id FROM users WHERE wallet_address = %s", (wallet_address,))
                if cur.fetchone():
                    return None
                hashed_seed = bcrypt.hashpw(wallet_seed.encode('utf-8'), bcrypt.gensalt())
                cur.execute(
                    "INSERT INTO users (wallet_address, wallet_seed, total_capital, indicators, weights, created_at) "
                    "VALUES (%s, %s, %s, %s, %s, NOW()) RETURNING user_id",
                    (wallet_address, hashed_seed, total_capital, Json(default_indicators), Json(default_weights))
                )
                user_id = cur.fetchone()[0]
                conn.commit()
                logging.info(json.dumps({"event": "user_created", "user_id": user_id, "wallet_address": wallet_address}))
                return user_id
    except Exception as e:
        logging.error(json.dumps({"event": "create_user_failed", "wallet_address": wallet_address, "error": str(e)}))
        raise

def create_session(user_id):
    import uuid
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Clean up expired sessions for this user
                cur.execute("DELETE FROM sessions WHERE user_id = %s AND expires_at < NOW()", (user_id,))
                session_id = str(uuid.uuid4())
                cur.execute(
                    "INSERT INTO sessions (user_id, session_id, expires_at) "
                    "VALUES (%s, %s, NOW() + INTERVAL '1 day') RETURNING session_id",
                    (user_id, session_id)
                )
                session_id = cur.fetchone()[0]
                conn.commit()
                logging.info(json.dumps({"event": "session_created", "user_id": user_id, "session_id": session_id}))
                return session_id
    except Exception as e:
        logging.error(json.dumps({"event": "create_session_failed", "user_id": user_id, "error": str(e)}))
        raise

def get_user_by_wallet(wallet_address_or_pub_key):
    """
    Retrieve user details by wallet address or public key.
    
    Args:
        wallet_address_or_pub_key (str): Wallet address or public key to lookup
        
    Returns:
        dict: User details (e.g., {'id': user_id, 'wallet_address': ..., 'wallet_seed': ...}) or None if not found
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute(
                    "SELECT user_id, wallet_address, total_capital, indicators, weights "
                    "FROM users WHERE wallet_address = %s",
                    (wallet_address_or_pub_key,)
                )
                user = cur.fetchone()
                if user:
                    user_dict = dict(user)
                    return user_dict
                return None
    except Exception as e:
        logging.error(json.dumps({"event": "get_user_by_wallet_failed", "wallet_address": wallet_address_or_pub_key, "error": str(e)}))
        raise

def get_user_id_from_session(session_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT user_id FROM sessions WHERE session_id = %s AND expires_at > NOW()",
                    (session_id,)
                )
                result = cur.fetchone()
                return result[0] if result else None
    except Exception as e:
        logging.error(json.dumps({"event": "get_user_id_from_session_failed", "session_id": session_id, "error": str(e)}))
        raise

def load_users():
    users = {}
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute(
                    "SELECT user_id, wallet_address, total_capital, paused, indicators, weights, "
                    "bridged_capital, active_capital, created_at FROM users"
                )
                for row in cur.fetchall():
                    user_dict = dict(row)
                    users[user_dict['user_id']] = user_dict
        return users
    except Exception as e:
        logging.error(json.dumps({"event": "load_users_failed", "error": str(e)}))
        raise

def update_user(user_id, **kwargs):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                fields = {k: Json(v) if isinstance(v, (dict, list)) else v for k, v in kwargs.items()}
                set_clause = ", ".join(f"{k} = %s" for k in fields.keys())
                cur.execute(f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE user_id = %s", (*fields.values(), user_id))
                conn.commit()
                logging.info(json.dumps({"event": "user_updated", "user_id": user_id}))
    except Exception as e:
        logging.error(json.dumps({"event": "update_user_failed", "user_id": user_id, "error": str(e)}))
        raise

def add_trade(user_id, token, direction, entry_time, exit_time, profit, entry_price, exit_price, factor_scores):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO trades (user_id, token, direction, entry_time, exit_time, profit, entry_price, exit_price, factor_scores) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (user_id, token, direction, entry_time, exit_time, profit, entry_price, exit_price, Json(factor_scores))
                )
                conn.commit()
                logging.info(json.dumps({"event": "trade_added", "user_id": user_id, "token": token}))
    except Exception as e:
        logging.error(json.dumps({"event": "add_trade_failed", "user_id": user_id, "error": str(e)}))
        raise

def get_all_trades(user_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute(
                    "SELECT * FROM trades WHERE user_id = %s ORDER BY exit_time DESC",
                    (user_id,)
                )
                return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logging.error(json.dumps({"event": "get_all_trades_failed", "user_id": user_id, "error": str(e)}))
        raise

def get_platform_stats():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT indicator, total_trades, total_profit, correct_predictions FROM platform_stats"
                )
                return {row[0]: {"total_trades": row[1], "total_profit": row[2], "correct_predictions": row[3]} for row in cur.fetchall()}
    except Exception as e:
        logging.error(json.dumps({"event": "get_platform_stats_failed", "error": str(e)}))
        raise

def update_platform_stats(indicator, profit, was_correct):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO platform_stats (indicator, total_trades, total_profit, correct_predictions) "
                    "VALUES (%s, 1, %s, %s) "
                    "ON CONFLICT (indicator) DO UPDATE SET "
                    "total_trades = platform_stats.total_trades + 1, "
                    "total_profit = platform_stats.total_profit + %s, "
                    "correct_predictions = platform_stats.correct_predictions + %s",
                    (indicator, profit, 1 if was_correct else 0, profit, 1 if was_correct else 0)
                )
                conn.commit()
    except Exception as e:
        logging.error(json.dumps({"event": "update_platform_stats_failed", "indicator": indicator, "error": str(e)}))
        raise

def get_platform_defaults():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT indicator, total_profit / total_trades AS avg_profit, "
                    "correct_predictions / total_trades::float AS accuracy "
                    "FROM platform_stats WHERE total_trades > 0"
                )
                stats = {row[0]: (row[1], row[2]) for row in cur.fetchall()}
                if not stats:
                    return (
                        ["ict", "elliott", "ema", "rsi", "wyckoff", "tokenomics", "onchain", "ecosystem", "tvl", "social", "whale", "market", "funding"],
                        {
                            "ict": 0.25, "elliott": 0.20, "ema": 0.15, "rsi": 0.15, "wyckoff": 0.25,
                            "tokenomics": 0.30, "onchain": 0.25, "ecosystem": 0.25, "tvl": 0.20,
                            "social": 0.20, "whale": 0.30, "market": 0.25, "funding": 0.25
                        }
                    )
                sorted_stats = sorted(stats.items(), key=lambda x: x[1][0] * x[1][1], reverse=True)
                tech_indicators = [ind for ind, _ in sorted_stats if ind in ["ict", "elliott", "ema", "rsi", "wyckoff"]][:5]
                fund_indicators = [ind for ind, _ in sorted_stats if ind in ["tokenomics", "onchain", "ecosystem", "tvl"]][:4]
                sent_indicators = [ind for ind, _ in sorted_stats if ind in ["social", "whale", "market", "funding"]][:4]
                indicators = tech_indicators + fund_indicators + sent_indicators
                weights = {
                    "ict": max(0.1, min(0.5, stats.get("ict", (0, 0))[0] * stats.get("ict", (0, 0))[1] + 0.25)),
                    "elliott": max(0.1, min(0.5, stats.get("elliott", (0, 0))[0] * stats.get("elliott", (0, 0))[1] + 0.20)),
                    "ema": max(0.1, min(0.5, stats.get("ema", (0, 0))[0] * stats.get("ema", (0, 0))[1] + 0.15)),
                    "rsi": max(0.1, min(0.5, stats.get("rsi", (0, 0))[0] * stats.get("rsi", (0, 0))[1] + 0.15)),
                    "wyckoff": max(0.1, min(0.5, stats.get("wyckoff", (0, 0))[0] * stats.get("wyckoff", (0, 0))[1] + 0.25)),
                    "tokenomics": max(0.1, min(0.5, stats.get("tokenomics", (0, 0))[0] * stats.get("tokenomics", (0, 0))[1] + 0.30)),
                    "onchain": max(0.1, min(0.5, stats.get("onchain", (0, 0))[0] * stats.get("onchain", (0, 0))[1] + 0.25)),
                    "ecosystem": max(0.1, min(0.5, stats.get("ecosystem", (0, 0))[0] * stats.get("ecosystem", (0, 0))[1] + 0.25)),
                    "tvl": max(0.1, min(0.5, stats.get("tvl", (0, 0))[0] * stats.get("tvl", (0, 0))[1] + 0.20)),
                    "social": max(0.1, min(0.5, stats.get("social", (0, 0))[0] * stats.get("social", (0, 0))[1] + 0.20)),
                    "whale": max(0.1, min(0.5, stats.get("whale", (0, 0))[0] * stats.get("whale", (0, 0))[1] + 0.30)),
                    "market": max(0.1, min(0.5, stats.get("market", (0, 0))[0] * stats.get("market", (0, 0))[1] + 0.25)),
                    "funding": max(0.1, min(0.5, stats.get("funding", (0, 0))[0] * stats.get("funding", (0, 0))[1] + 0.25))
                }
                return indicators, weights
    except Exception as e:
        logging.error(json.dumps({"event": "get_platform_defaults_failed", "error": str(e)}))
        raise

def cleanup_expired_sessions():
    """Remove all expired sessions from the database."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM sessions WHERE expires_at < NOW()")
                conn.commit()
                logging.info(json.dumps({"event": "expired_sessions_cleaned"}))
    except Exception as e:
        logging.error(json.dumps({"event": "cleanup_expired_sessions_failed", "error": str(e)}))
        raise
