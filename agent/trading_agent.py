import requests
from bs4 import BeautifulSoup
import tweepy
import pandas as pd
import numpy as np
import logging
import schedule
import time
from datetime import datetime
from cosmospy import Transaction, CosmosAPI
from injective.client import Client
from injective.constant import Network
from injective.composer import Composer
from ta.trend import EMAIndicator
from ta.momentum import RSIIndicator
import threading
import os
import json
import asyncio
from config import COSMOS_RPC, INJECTIVE_GRPC, INJECTIVE_REST, X_API_KEY, X_API_SECRET, IBC_CHANNEL, SECRET_AI_API_KEY, WHALE_TX_THRESHOLD
from token_fetcher import fetch_cosmos_tokens
from db import update_user, add_trade, update_platform_stats, get_all_trades
from bech32 import bech32_decode, bech32_encode
from secret_ai_sdk import SecretAIClientAsync, ChatSecret

logging.basicConfig(filename="cosmos_trading_agent.log", level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

cosmos_client = CosmosAPI(rpc_url=COSMOS_RPC)
injective_network = Network.mainnet()
injective_client = Client(network=injective_network, grpc_endpoint=INJECTIVE_GRPC)
injective_composer = Composer(network=injective_network.string())

if not SECRET_AI_API_KEY:
    raise ValueError("SECRET_AI_API_KEY environment variable not set")
secret_client_async = SecretAIClientAsync(api_key=SECRET_AI_API_KEY)
secret_llm = ChatSecret(model="deepseek-coder:33b", api_key=SECRET_AI_API_KEY)

class UserAgent:
    def __init__(self, user_id, wallet_address, wallet_seed, total_capital, paused=False, indicators=None, weights=None, bridged_capital=0, active_capital=0):
        self.user_id = user_id
        self.wallet_address = wallet_address
        self.wallet_seed = wallet_seed
        self.total_capital = total_capital
        self.trade_size = total_capital * 0.001
        self.max_active_capital = total_capital * 0.1
        self.leverage = 20
        self.portfolio = {}
        self.active_capital = active_capital
        self.bridged_capital = bridged_capital
        self.paused = paused
        self.weights = weights or {
            "ict": 0.25, "elliott": 0.20, "ema": 0.15, "rsi": 0.15, "wyckoff": 0.25,
            "tokenomics": 0.30, "onchain": 0.25, "ecosystem": 0.25, "tvl": 0.20,
            "social": 0.20, "whale": 0.30, "market": 0.25, "funding": 0.25
        }
        self.indicators = indicators or ["ict", "elliott", "ema", "rsi", "wyckoff", "tokenomics", "onchain", "ecosystem", "tvl", "social", "whale", "market", "funding"]
        self.learning_rate = 0.1
        self.discount_factor = 0.9
        self.trends = {ind: 0.0 for ind in self.indicators}  # Track trend scores
        self.tokens = fetch_cosmos_tokens(user_id)
        self.chain_addresses = self._derive_chain_addresses()
        self.subaccount_id = "0x" + os.urandom(16).hex()
        if not paused:
            self.bridge_atom_to_injective()
            self.start()

    def _derive_chain_addresses(self):
        try:
            hrp, data = bech32_decode(self.wallet_address)
            if not hrp or not data:
                raise ValueError("Invalid wallet address")
            return {"cosmoshub": self.wallet_address, "injective": bech32_encode("inj", data)}
        except Exception as e:
            logging.error(json.dumps({"event": "derive_addresses_failed", "user_id": self.user_id, "error": str(e)}))
            raise

    def bridge_atom_to_injective(self):
        try:
            atom_to_bridge = min(self.total_capital * 0.5, self.total_capital - self.active_capital)
            if atom_to_bridge <= 0:
                return
            tx = Transaction(
                privkey=self.wallet_seed,
                account_num=cosmos_client.get_account(self.wallet_address)["account_number"],
                sequence=cosmos_client.get_account(self.wallet_address)["sequence"],
                chain_id="cosmoshub-4",
                gas=200000,
                fee=5000
            )
            tx.add_msg(
                msg_type="cosmos-sdk/MsgTransfer",
                data={
                    "source_port": "transfer",
                    "source_channel": IBC_CHANNEL,
                    "token": {"denom": "uatom", "amount": str(int(atom_to_bridge * 10**6))},
                    "sender": self.wallet_address,
                    "receiver": self.chain_addresses["injective"],
                    "timeout_height": {"revision_number": "0", "revision_height": str(cosmos_client.get_latest_block()["block"]["header"]["height"] + 1000)},
                    "timeout_timestamp": "0"
                }
            )
            tx.sign_and_broadcast()
            self.bridged_capital += atom_to_bridge
            update_user(self.user_id, bridged_capital=self.bridged_capital)
            logging.info(json.dumps({"event": "bridge_success", "user_id": self.user_id, "amount": atom_to_bridge}))
        except Exception as e:
            logging.error(json.dumps({"event": "bridge_failed", "user_id": self.user_id, "error": str(e)}))

    async def scrape_web_sentiment(self, token):
        url = f"https://cointelegraph.com/search?query={token}"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            articles = [a.text for a in soup.find_all("h2", class_="article-title")[:5]]
            if not articles:
                return 0
            messages = [
                ("system", "Analyze sentiment of these article titles. Score -5 (negative) to 5 (positive)."),
                ("human", "\n".join(articles))
            ]
            result = await secret_llm.invoke(messages, stream=False)
            sentiment_score = float(result.content.strip())
            self.trends["market"] = sentiment_score / 5  # Track trend
            logging.info(json.dumps({"event": "web_sentiment", "user_id": self.user_id, "token": token, "score": sentiment_score}))
            return sentiment_score / 5
        except Exception as e:
            logging.error(json.dumps({"event": "web_sentiment_failed", "user_id": self.user_id, "token": token, "error": str(e)}))
            return 0

    async def scrape_x_sentiment(self, token):
        try:
            auth = tweepy.OAuthHandler(X_API_KEY, X_API_SECRET)
            api = tweepy.API(auth, wait_on_rate_limit=True)
            tweets = [t.full_text for t in api.search_tweets(q=token, count=100, lang="en", tweet_mode="extended")]
            if not tweets:
                return 0
            messages = [
                ("system", "Analyze sentiment of these X posts. Score -5 (negative) to 5 (positive)."),
                ("human", "\n".join(tweets))
            ]
            result = await secret_llm.invoke(messages, stream=False)
            sentiment_score = float(result.content.strip())
            self.trends["social"] = sentiment_score / 5  # Track trend
            logging.info(json.dumps({"event": "x_sentiment", "user_id": self.user_id, "token": token, "score": sentiment_score}))
            return sentiment_score / 5
        except Exception as e:
            logging.error(json.dumps({"event": "x_sentiment_failed", "user_id": self.user_id, "token": token, "error": str(e)}))
            return 0

    def get_whale_activity(self, token):
        try:
            market_id = self.get_market_id(token)
            tx_history = injective_client.get_derivative_tx_history(market_id=market_id, limit=50)
            current_price = self.get_current_price(token)
            whale_score = 0
            for tx in tx_history.transactions:
                amount = float(tx.quantity) * float(tx.price)
                usd_value = amount * current_price / 10**18
                if usd_value > WHALE_TX_THRESHOLD:
                    if "exchange" in tx.receiver.lower():
                        whale_score -= 1
                    else:
                        whale_score += 1
            normalized_score = min(max(whale_score / 10, -1), 1)
            self.trends["whale"] = normalized_score  # Track trend
            logging.info(json.dumps({"event": "whale_activity", "user_id": self.user_id, "token": token, "score": normalized_score}))
            return normalized_score
        except Exception as e:
            logging.error(json.dumps({"event": "whale_activity_failed", "user_id": self.user_id, "token": token, "error": str(e)}))
            return 0

    def get_fundamental_score(self, token):
        try:
            staking = injective_client.get_staking_validators()
            staking_yield = sum(float(v["commission"]["commission_rates"]["rate"]) for v in staking.validators) / len(staking.validators)
            balance = injective_client.get_bank_balance(self.chain_addresses["injective"], f"peggy0x{token}")
            volume = float(balance.amount) / 10**18 if balance else 0
            whale_score = self.get_whale_activity(token)
            tokenomics_score = min((staking_yield * 100) + (volume / 1e6), 10) * 0.3
            onchain_score = min(volume / 1e6, 10) * 0.25
            ecosystem_score = min(staking_yield * 50, 10) * 0.25
            tvl_score = min(volume * staking_yield, 10) * 0.20
            fundamental_score = tokenomics_score + onchain_score + ecosystem_score + tvl_score
            adjusted_score = fundamental_score * (1 + whale_score * 0.5)
            final_score = min(max(adjusted_score, 0), 10)
            self.trends.update({
                "tokenomics": tokenomics_score / 10,
                "onchain": onchain_score / 10,
                "ecosystem": ecosystem_score / 10,
                "tvl": tvl_score / 10,
                "funding": staking_yield * 0.25  # Simulate funding rates
            })  # Track trends
            logging.info(json.dumps({"event": "fundamental_score", "user_id": self.user_id, "token": token, 
                                    "tokenomics": tokenomics_score, "onchain": onchain_score, "ecosystem": ecosystem_score, 
                                    "tvl": tvl_score, "whale": whale_score, "final_score": final_score}))
            return final_score
        except Exception as e:
            logging.error(json.dumps({"event": "fundamental_score_failed", "user_id": self.user_id, "token": token, "error": str(e)}))
            return 0

    def get_technical_score(self, token):
        try:
            price_data = self.fetch_price_data(token)
            df = pd.DataFrame(price_data, columns=["timestamp", "open", "high", "low", "close", "volume"])
            current_price = df["close"].iloc[-1]
            scores = {}

            if "ict" in self.indicators:
                daily_high = df["high"].max()
                daily_low = df["low"].min()
                liquidity_above = daily_high * 1.01
                liquidity_below = daily_low * 0.99
                df["range"] = df["high"] - df["low"]
                order_block = df["close"][df["range"] == df["range"].min()].iloc[-1]
                df["gap"] = df["open"].shift(-1) - df["close"]
                fvg = df["gap"][abs(df["gap"]) > df["range"].mean()].mean() or 0
                ict_score = 0
                if current_price > order_block and abs(current_price - liquidity_above) < 0.02 * current_price:
                    ict_score += 5
                elif current_price < order_block and abs(current_price - liquidity_below) < 0.02 * current_price:
                    ict_score -= 5
                if fvg > 0 and current_price < daily_high:
                    ict_score += 3
                elif fvg < 0 and current_price > daily_low:
                    ict_score -= 3
                scores["ict"] = ict_score
                self.trends["ict"] = ict_score / 10  # Track trend

            if "elliott" in self.indicators:
                peaks = df["high"][(df["high"].shift(1) < df["high"]) & (df["high"].shift(-1) < df["high"])].index
                troughs = df["low"][(df["low"].shift(1) > df["low"]) & (df["low"].shift(-1) > df["low"])].index
                if len(peaks) >= 3 and len(troughs) >= 2:
                    last_wave = df["close"].iloc[peaks[-1]] - df["close"].iloc[troughs[-1]] if peaks[-1] > troughs[-1] else df["close"].iloc[troughs[-1]] - df["close"].iloc[peaks[-1]]
                    elliott_score = 3 if last_wave > 0 and current_price > df["close"].iloc[peaks[-1]] else -3 if last_wave < 0 and current_price < df["close"].iloc[troughs[-1]] else 0
                else:
                    elliott_score = 0
                scores["elliott"] = elliott_score
                self.trends["elliott"] = elliott_score / 10  # Track trend

            if "ema" in self.indicators:
                ema_short = EMAIndicator(df["close"], window=20).ema_indicator().iloc[-1]
                ema_long = EMAIndicator(df["close"], window=50).ema_indicator().iloc[-1]
                ema_score = 2 if ema_short > ema_long else -2 if ema_short < ema_long else 0
                scores["ema"] = ema_score
                self.trends["ema"] = ema_score / 10  # Track trend

            if "rsi" in self.indicators:
                rsi = RSIIndicator(df["close"], window=14).rsi().iloc[-1]
                rsi_score = 2 if rsi < 30 else -2 if rsi > 70 else 0
                scores["rsi"] = rsi_score
                self.trends["rsi"] = rsi_score / 10  # Track trend

            if "wyckoff" in self.indicators:
                volume_trend = df["volume"].rolling(window=10).mean().iloc[-1]
                price_trend = df["close"].rolling(window=10).mean().iloc[-1]
                prev_price_trend = df["close"].rolling(window=10).mean().iloc[-11]
                wyckoff_score = 0
                if volume_trend > df["volume"].mean() and price_trend > prev_price_trend:
                    wyckoff_score = 3
                elif volume_trend > df["volume"].mean() and price_trend < prev_price_trend:
                    wyckoff_score = -3
                scores["wyckoff"] = wyckoff_score
                self.trends["wyckoff"] = wyckoff_score / 10  # Track trend

            logging.info(json.dumps({"event": "technical_score", "user_id": self.user_id, "token": token, "scores": scores}))
            return scores
        except Exception as e:
            logging.error(json.dumps({"event": "technical_score_failed", "user_id": self.user_id, "token": token, "error": str(e)}))
            return {ind: 0 for ind in self.indicators}

    def fetch_price_data(self, token):
        try:
            market_id = self.get_market_id(token)
            candles = injective_client.get_historical_derivative_candles(
                market_id=market_id,
                interval="1h",
                limit=50
            )
            return [[float(c.timestamp), float(c.open), float(c.high), float(c.low), float(c.close), float(c.volume)] for c in candles.candles]
        except Exception as e:
            logging.error(json.dumps({"event": "fetch_price_data_failed", "user_id": self.user_id, "token": token, "error": str(e)}))
            return [[i, 100 + i*0.1, 101 + i*0.1, 99 + i*0.1, 100 + i*0.1, 1000] for i in range(50)]

    def get_market_id(self, token):
        markets = injective_client.get_derivative_markets()
        for market in markets.markets:
            if token.upper() in market.ticker:
                return market.market_id
        raise ValueError(f"No market found for token: {token}")

    async def predict_movement(self, token):
        sentiment_web = await self.scrape_web_sentiment(token)
        sentiment_x = await self.scrape_x_sentiment(token)
        sentiment_total = sentiment_web + sentiment_x
        fundamental = self.get_fundamental_score(token)
        tech_scores = self.get_technical_score(token)

        factor_scores = {
            "ict": tech_scores.get("ict", 0) * self.weights["ict"],
            "elliott": tech_scores.get("elliott", 0) * self.weights["elliott"],
            "ema": tech_scores.get("ema", 0) * self.weights["ema"],
            "rsi": tech_scores.get("rsi", 0) * self.weights["rsi"],
            "wyckoff": tech_scores.get("wyckoff", 0) * self.weights["wyckoff"],
            "tokenomics": fundamental * self.weights["tokenomics"] * 0.3,
            "onchain": fundamental * self.weights["onchain"] * 0.25,
            "ecosystem": fundamental * self.weights["ecosystem"] * 0.25,
            "tvl": fundamental * self.weights["tvl"] * 0.20,
            "social": sentiment_total * self.weights["social"],
            "whale": self.get_whale_activity(token) * self.weights["whale"],
            "market": sentiment_total * self.weights["market"],
            "funding": fundamental * self.weights["funding"] * 0.25
        }
        total_score = sum(factor_scores.values())

        logging.info(json.dumps({"event": "predict_movement", "user_id": self.user_id, "token": token, "total_score": total_score, "factor_scores": factor_scores}))
        if total_score > 15:
            return ("long", total_score, factor_scores)
        elif total_score < -15:
            return ("short", -total_score, factor_scores)
        return (None, 0, factor_scores)

    def open_position(self, token, direction, factor_scores):
        if self.active_capital + self.trade_size > self.max_active_capital or self.bridged_capital < self.trade_size:
            logging.info(json.dumps({"event": "open_position_failed", "user_id": self.user_id, "token": token, "reason": "insufficient_capital"}))
            self.bridge_atom_to_injective()
            return
        try:
            market_id = self.get_market_id(token)
            price = self.get_current_price(token)
            amount = self.trade_size * self.leverage
            order = injective_composer.MarketOrder(
                market_id=market_id,
                subaccount_id=self.subaccount_id,
                fee_recipient=self.chain_addresses["injective"],
                buy=direction == "long",
                quantity=str(amount),
                price=str(price)
            )
            tx_result = injective_client.create_derivative_order(order=order, private_key=self.wallet_seed)
            self.portfolio[token] = {
                "amount": amount,
                "entry_time": datetime.now(),
                "entry_price": price,
                "direction": direction,
                "leverage": self.leverage,
                "factor_scores": factor_scores,
                "order_hash": tx_result["orderHash"]
            }
            self.active_capital += self.trade_size
            self.bridged_capital -= self.trade_size
            update_user(self.user_id, active_capital=self.active_capital, bridged_capital=self.bridged_capital)
            logging.info(json.dumps({"event": "position_opened", "user_id": self.user_id, "token": token, "direction": direction, "amount": amount, "price": price}))
        except Exception as e:
            logging.error(json.dumps({"event": "open_position_failed", "user_id": self.user_id, "token": token, "error": str(e)}))

    def close_position(self, token):
        if token not in self.portfolio:
            return
        try:
            data = self.portfolio[token]
            market_id = self.get_market_id(token)
            price = self.get_current_price(token)
            profit = (price - data["entry_price"]) * data["amount"] if data["direction"] == "long" else (data["entry_price"] - price) * data["amount"]
            profit *= data["leverage"]
            injective_client.cancel_derivative_order(
                market_id=market_id,
                subaccount_id=self.subaccount_id,
                order_hash=data["order_hash"]
            )
            add_trade(self.user_id, token, data["direction"], data["entry_time"], datetime.now(), profit, data["entry_price"], price, data["factor_scores"])
            self.active_capital -= self.trade_size
            self.bridged_capital += self.trade_size + profit / self.leverage
            update_user(self.user_id, active_capital=self.active_capital, bridged_capital=self.bridged_capital)
            self.update_weights(token, profit, data["direction"], data["factor_scores"])
            logging.info(json.dumps({"event": "position_closed", "user_id": self.user_id, "token": token, "profit": profit}))
            del self.portfolio[token]
        except Exception as e:
            logging.error(json.dumps({"event": "close_position_failed", "user_id": self.user_id, "token": token, "error": str(e)}))

    def update_weights(self, token, profit, direction, factor_scores):
        reward = profit / self.trade_size
        total_score = sum(factor_scores.values())
        was_long = direction == "long"
        was_profitable = profit > 0

        for factor, score in factor_scores.items():
            factor_predicted_up = score > 0
            was_correct = (factor_predicted_up and was_long and was_profitable) or (not factor_predicted_up and not was_long and was_profitable)
            contribution = abs(score) / (abs(total_score) + 1e-6)
            delta = self.learning_rate * contribution * (reward if was_correct else -reward) * self.discount_factor
            self.weights[factor] = max(0.1, min(0.5, self.weights[factor] + delta))  # Constrain weights
            update_platform_stats(factor, profit, was_correct)

        update_user(self.user_id, weights=self.weights)
        logging.info(json.dumps({"event": "weights_updated", "user_id": self.user_id, "token": token, "weights": self.weights}))

    def get_current_price(self, token):
        try:
            market_id = self.get_market_id(token)
            ticker = injective_client.get_derivative_ticker(market_id=market_id)
            return float(ticker.ticker.price)
        except Exception as e:
            logging.error(json.dumps({"event": "get_current_price_failed", "user_id": self.user_id, "token": token, "error": str(e)}))
            return 100

    def prune_trades(self):
        for token, data in list(self.portfolio.items()):
            current_price = self.get_current_price(token)
            time_held = (datetime.now() - data["entry_time"]).total_seconds() / 3600
            price_change = (current_price - data["entry_price"]) / data["entry_price"] if data["direction"] == "long" else (data["entry_price"] - current_price) / data["entry_price"]
            if (price_change < -0.05) or (time_held > 24 and abs(price_change) < 0.01):
                self.close_position(token)
                logging.info(json.dumps({"event": "trade_pruned", "user_id": self.user_id, "token": token, "reason": "loss" if price_change < 0 else "stuck"}))

    def manage_trades(self):
        if self.paused:
            return
        self.total_capital = get_atom_capital(self.wallet_address)
        self.trade_size = self.total_capital * 0.001
        self.max_active_capital = self.total_capital * 0.1
        self.prune_trades()
        for token, data in list(self.portfolio.items()):
            time_held = (datetime.now() - data["entry_time"]).total_seconds() / 3600
            current_price = self.get_current_price(token)
            profit_potential = (current_price - data["entry_price"]) / data["entry_price"] if data["direction"] == "long" else (data["entry_price"] - current_price) / data["entry_price"]
            if time_held >= 72 or profit_potential >= 0.1:
                self.close_position(token)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        for token in self.tokens:
            if token not in self.portfolio:
                direction, confidence, factor_scores = loop.run_until_complete(self.predict_movement(token))
                if direction:
                    self.open_position(token, direction, factor_scores)
        loop.close()

    def start(self):
        def run_schedule():
            schedule.every(1).hours.do(self.manage_trades)
            while not self.paused:
                schedule.run_pending()
                time.sleep(60)
        threading.Thread(target=run_schedule, daemon=True).start()

def get_atom_capital(wallet_address):
    try:
        balances = cosmos_client.get_bank_balances(wallet_address)
        atom_balance = next((float(b["amount"]) / 10**6 for b in balances["balances"] if b["denom"] == "uatom"), 0)
        return atom_balance
    except Exception as e:
        logging.error(json.dumps({"event": "get_atom_capital_failed", "wallet_address": wallet_address, "error": str(e)}))
        return 1000
        