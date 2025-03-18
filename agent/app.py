from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
import threading
import logging
import json
from trading_agent import UserAgent, get_atom_capital
from auth import signup
from db import get_user_id_from_session, load_users, update_user, get_all_trades, get_platform_stats
from config import SECRET_KEY, ALLOWED_ORIGINS

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
limiter = Limiter(get_remote_address, app=app, default_limits=["100 per day", "10 per hour"])
CORS(app, origins=ALLOWED_ORIGINS)

logging.basicConfig(filename="cosmos_trading_agent.log", level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

agents = {}
agents_lock = threading.Lock()

@app.route('/signup', methods=['POST'])
@limiter.limit("5 per minute")
def signup_route():
    data = request.get_json()
    required_fields = ["signature", "nonce", "timestamp"]
    if not data or not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    session_id, message, wallet_address, inj_address, wallet_seed = signup(data["signature"], data["nonce"], data["timestamp"], get_atom_capital)
    if not session_id:
        return jsonify({"error": message}), 401 if message == "Invalid or expired signature" else 400
    with agents_lock:
        user_id = get_user_id_from_session(session_id)
        default_indicators, default_weights = get_platform_defaults()
        agents[user_id] = UserAgent(user_id, wallet_address, wallet_seed, get_atom_capital(wallet_address),
                                    indicators=default_indicators, weights=default_weights)
    return jsonify({
        "message": message,
        "session_id": session_id,
        "cosmos_address": wallet_address,
        "injective_address": inj_address,
        "wallet_seed": wallet_seed  # Return seed for user to store securely
    }), 201

@app.route('/users/pause', methods=['POST'])
@limiter.limit("10 per minute")
def pause_user():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    with agents_lock:
        if user_id not in agents:
            return jsonify({"error": "User agent not found"}), 404
        agents[user_id].paused = True
        update_user(user_id, paused=True)
    return jsonify({"message": "Agent paused"}), 200

@app.route('/users/unpause', methods=['POST'])
@limiter.limit("10 per minute")
def unpause_user():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    with agents_lock:
        if user_id not in agents:
            return jsonify({"error": "User agent not found"}), 404
        agents[user_id].paused = False
        agents[user_id].start()
        update_user(user_id, paused=False)
    return jsonify({"message": "Agent unpaused"}), 200

@app.route('/users/status', methods=['GET'])
@limiter.limit("10 per minute")
def get_status():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    with agents_lock:
        if user_id not in agents:
            return jsonify({"error": "User agent not found"}), 404
        user = agents[user_id]
        trades = get_all_trades(user_id)
        return jsonify({
            "user_id": user.user_id,
            "wallet_address": user.wallet_address,
            "paused": user.paused,
            "total_capital": user.total_capital,
            "bridged_capital": user.bridged_capital,
            "active_capital": user.active_capital,
            "indicators": user.indicators,
            "weights": user.weights,
            "trends": user.trends,
            "portfolio": user.portfolio,
            "trade_history": trades
        }), 200

@app.route('/users/config', methods=['GET'])
@limiter.limit("10 per minute")
def get_user_config():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    with agents_lock:
        if user_id not in agents:
            return jsonify({"error": "User agent not found"}), 404
        user = agents[user_id]
        config = {
            "technical_analysis": {
                "ict": {"weight": user.weights["ict"], "description": "Institutional Candle Theory framework"},
                "elliott": {"weight": user.weights["elliott"], "description": "Wave pattern analysis"},
                "ema": {"weight": user.weights["ema"], "description": "EMA crossovers and trends"},
                "rsi": {"weight": user.weights["rsi"], "description": "Relative Strength Index"},
                "wyckoff": {"weight": user.weights["wyckoff"], "description": "Market structure analysis"}
            },
            "fundamental_analysis": {
                "tokenomics": {"weight": user.weights["tokenomics"], "description": "Token supply and distribution metrics"},
                "onchain": {"weight": user.weights["onchain"], "description": "Network usage and transaction volume"},
                "ecosystem": {"weight": user.weights["ecosystem"], "description": "Development activity and adoption"},
                "tvl": {"weight": user.weights["tvl"], "description": "Total Value Locked growth patterns"}
            },
            "market_sentiment": {
                "social": {"weight": user.weights["social"], "description": "Mentions across social platforms"},
                "whale": {"weight": user.weights["whale"], "description": "Large holder activity"},
                "market": {"weight": user.weights["market"], "description": "Overall market mood and direction"},
                "funding": {"weight": user.weights["funding"], "description": "Perpetual swap funding rates"}
            },
            "total_weight": sum(user.weights.values())
        }
        return jsonify(config), 200

@app.route('/users/trades', methods=['GET'])
@limiter.limit("10 per minute")
def get_user_trades():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    trades = get_all_trades(user_id)
    return jsonify({"trades": trades}), 200

@app.route('/users/close-position', methods=['POST'])
@limiter.limit("10 per minute")
def close_position():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    data = request.get_json()
    token = data.get("token")
    if not token:
        return jsonify({"error": "Missing token parameter"}), 400
    with agents_lock:
        if user_id not in agents:
            return jsonify({"error": "User agent not found"}), 404
        agents[user_id].close_position(token)
    return jsonify({"message": f"Position for {token} closed"}), 200

@app.route('/users/pnl', methods=['GET'])
@limiter.limit("10 per minute")
def get_pnl():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    trades = get_all_trades(user_id)
    total_profit = sum(trade["profit"] for trade in trades if trade["exit_time"])
    initial_capital = get_atom_capital(agents[user_id].wallet_address) if user_id in agents else 1000
    pnl_absolute = total_profit
    pnl_percentage = (total_profit / initial_capital * 100) if initial_capital else 0
    return jsonify({"pnl_absolute": pnl_absolute, "pnl_percentage": pnl_percentage}), 200

@app.route('/users/win-rate', methods=['GET'])
@limiter.limit("10 per minute")
def get_user_win_rate():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    trades = get_all_trades(user_id)
    total_trades = len(trades)
    winning_trades = sum(1 for trade in trades if trade["profit"] > 0 and trade["exit_time"])
    win_rate_absolute = winning_trades
    win_rate_percentage = (winning_trades / total_trades * 100) if total_trades else 0
    return jsonify({"win_rate_absolute": win_rate_absolute, "win_rate_percentage": win_rate_percentage}), 200

@app.route('/platform/win-rate', methods=['GET'])
@limiter.limit("10 per minute")
def get_platform_win_rate():
    stats = get_platform_stats()
    total_trades = sum(stat["total_trades"] for stat in stats.values())
    correct_predictions = sum(stat["correct_predictions"] for stat in stats.values())
    win_rate_absolute = correct_predictions
    win_rate_percentage = (correct_predictions / total_trades * 100) if total_trades else 0
    return jsonify({"win_rate_absolute": win_rate_absolute, "win_rate_percentage": win_rate_percentage}), 200

@app.route('/users/update-weights', methods=['POST'])
@limiter.limit("10 per minute")
def update_weights():
    session_id = request.headers.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing session_id header"}), 401
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        return jsonify({"error": "Invalid session_id"}), 401
    data = request.get_json()
    new_weights = data.get("weights")
    if not new_weights or not isinstance(new_weights, dict):
        return jsonify({"error": "Invalid weights data"}), 400
    total_weight = sum(new_weights.values())
    if not 0.9 <= total_weight <= 1.1:  # Allow slight deviation
        return jsonify({"error": "Weights must sum to approximately 100%"}), 400
    with agents_lock:
        if user_id not in agents:
            return jsonify({"error": "User agent not found"}), 404
        agents[user_id].weights = {k: v for k, v in new_weights.items() if k in agents[user_id].indicators}
        update_user(user_id, weights=agents[user_id].weights)
    return jsonify({"message": "Weights updated", "weights": agents[user_id].weights}), 200

def load_agents():
    try:
        users = load_users()
        with agents_lock:
            for user_id, data in users.items():
                agents[user_id] = UserAgent(
                    user_id=user_id,
                    wallet_address=data["wallet_address"],
                    wallet_seed=data["wallet_seed"],
                    total_capital=data["total_capital"],
                    paused=data["paused"],
                    indicators=data["indicators"],
                    weights=data["weights"],
                    bridged_capital=data["bridged_capital"],
                    active_capital=data["active_capital"]
                )
    except Exception as e:
        logging.error(json.dumps({"event": "load_agents_failed", "error": str(e)}))
        raise

if __name__ == "__main__":
    load_agents()
    app.run(host="0.0.0.0", port=5000, debug=False)
    