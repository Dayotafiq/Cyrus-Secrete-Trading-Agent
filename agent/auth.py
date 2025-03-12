import logging
import json
from cosmospy import generate_wallet, verify_signature
from db import create_user, create_session, get_platform_defaults
from datetime import datetime, timedelta
from bech32 import bech32_encode, convertbits

logging.basicConfig(filename="cosmos_trading_agent.log", level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def verify_signature(wallet_address, signature, nonce, timestamp):
    try:
        if datetime.utcnow() - datetime.fromisoformat(timestamp) > timedelta(minutes=5):
            return False
        message = f"Sign this nonce to authenticate with Cosmos Trading Agent: {nonce}"
        sig_bytes = bytes.fromhex(signature["signature"])
        pub_key = bytes.fromhex(signature["pub_key"]["value"])
        return verify_signature(message, sig_bytes, pub_key)
    except Exception as e:
        logging.error(json.dumps({"event": "signature_verification_failed", "wallet_address": wallet_address, "error": str(e)}))
        return False

def derive_injective_address(cosmos_address):
    """Derives an Injective address from a Cosmos address."""
    try:
        _, data = bech32.bech32_decode(cosmos_address)
        if not data:
            raise ValueError("Invalid Cosmos address")
        converted = convertbits(data, 5, 8, False)
        return bech32_encode("inj", converted)
    except Exception as e:
        logging.error(json.dumps({"event": "derive_injective_address_failed", "cosmos_address": cosmos_address, "error": str(e)}))
        raise

def signup(signature, nonce, timestamp, get_atom_capital):
    if not all([signature, nonce, timestamp]):
        return None, "Missing required fields"
    
    # Generate a new wallet for the user
    wallet = generate_wallet()
    wallet_address = wallet["address"]  # Cosmos Hub address
    wallet_seed = wallet["seed"]

    # Verify the signature
    if not verify_signature(wallet_address, signature, nonce, timestamp):
        return None, "Invalid or expired signature"

    # Derive Injective address
    inj_address = derive_injective_address(wallet_address)

    # Fetch default indicators and weights
    default_indicators, default_weights = get_platform_defaults()

    # Create user in the database
    user_id = create_user(wallet_address, wallet_seed, get_atom_capital(wallet_address), default_indicators, default_weights)
    if not user_id:
        return None, "Wallet address already registered"

    # Create a session for the user
    session_id = create_session(user_id)
    logging.info(json.dumps({"event": "signup_success", "user_id": user_id, "wallet_address": wallet_address, "injective_address": inj_address}))

    return session_id, "User created", wallet_address, inj_address, wallet_seed
    