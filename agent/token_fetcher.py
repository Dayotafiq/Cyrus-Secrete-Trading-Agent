import requests
import logging
import json
from config import COINGECKO_API_KEY

logging.basicConfig(filename="cosmos_trading_agent.log", level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def fetch_cosmos_tokens(user_id):
    tokens = set()
    timeout = 10

    try:
        response = requests.get("https://raw.githubusercontent.com/cosmos/chain-registry/master/chain.json", timeout=timeout)
        response.raise_for_status()
        chains = response.json()
        registry_tokens = [chain["chain_id"] for chain in chains if "cosmos" in chain["chain_name"].lower()]
        tokens.update(registry_tokens)
        logging.info(json.dumps({"event": "fetch_registry_tokens", "user_id": user_id, "count": len(registry_tokens)}))
    except requests.RequestException as e:
        logging.error(json.dumps({"event": "fetch_registry_failed", "user_id": user_id, "error": str(e)}))
        tokens.update(["atom", "osmo", "inj"])

    try:
        response = requests.get("https://api.dexscreener.com/latest/dex/search?q=cosmos", timeout=timeout)
        response.raise_for_status()
        pairs = response.json().get("pairs", [])
        dexscreener_tokens = {pair["baseToken"]["symbol"].lower() for pair in pairs if "cosmos" in pair["chainId"].lower()}
        tokens.update(dexscreener_tokens)
        logging.info(json.dumps({"event": "fetch_dexscreener_tokens", "user_id": user_id, "count": len(dexscreener_tokens)}))
    except requests.RequestException as e:
        logging.error(json.dumps({"event": "fetch_dexscreener_failed", "user_id": user_id, "error": str(e)}))

    if COINGECKO_API_KEY:
        try:
            url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=cosmos-ecosystem"
            headers = {"x-cg-api-key": COINGECKO_API_KEY}
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            coins = response.json()
            coingecko_tokens = {coin["symbol"].lower() for coin in coins}
            tokens.update(coingecko_tokens)
            logging.info(json.dumps({"event": "fetch_coingecko_tokens", "user_id": user_id, "count": len(coingecko_tokens)}))
        except requests.RequestException as e:
            logging.error(json.dumps({"event": "fetch_coingecko_failed", "user_id": user_id, "error": str(e)}))

    token_list = list(tokens)
    logging.info(json.dumps({"event": "tokens_aggregated", "user_id": user_id, "count": len(token_list)}))
    return token_list
    