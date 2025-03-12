import os
from dotenv import load_dotenv

load_dotenv()

# Security: Validates required environment variables
required_vars = ["X_API_KEY", "X_API_SECRET", "SECRET_AI_API_KEY", "DB_USER", "DB_PASSWORD", "SECRET_KEY"]
for var in required_vars:
    if not os.getenv(var):
        raise ValueError(f"Missing required environment variable: {var}")

COSMOS_RPC = os.getenv("COSMOS_RPC", "https://rpc.cosmos.network")
INJECTIVE_GRPC = os.getenv("INJECTIVE_GRPC", "grpc.mainnet.injective.network:9900")
INJECTIVE_REST = os.getenv("INJECTIVE_REST", "https://mainnet.injective.network")
X_API_KEY = os.getenv("X_API_KEY")
X_API_SECRET = os.getenv("X_API_SECRET")
SECRET_AI_API_KEY = os.getenv("SECRET_AI_API_KEY")
IBC_CHANNEL = os.getenv("IBC_CHANNEL", "channel-141")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cosmos_trading")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
SECRET_KEY = os.getenv("SECRET_KEY")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
WHALE_TX_THRESHOLD = float(os.getenv("WHALE_TX_THRESHOLD", "500000"))
