# Cyrus-Secret-Trading-Agent

A production-ready trading agent for Cosmos ecosystem tokens on Injective futures, featuring 
advanced technical analysis, fundamental analysis, market sentiment, and user management APIs.

## Features

- **Technical Analysis**: ICT, Elliott Wave, EMA, RSI, Wyckoff.
- **Fundamental Analysis**: Tokenomics, On-chain Activity, Ecosystem Growth, TVL Trends.
- **Market Sentiment**: Social Volume, Whale Activity, Market Sentiment, Funding Rates.
- **APIs**: View all trades, manual position closure, PnL, win rate (user/platform), weight updates, 
trend tracking.
- **Security**: Rate limiting, CORS, encrypted seeds, session expiry.
- **Account Creation**: Automatically generates Cosmos Hub and Injective accounts.

## Technical Architecture

Cyrus AI is a Python-based application with a PostgreSQL backend, integrating with Injective 
futures and external APIs for market data. Below is its technical structure:

### Frontend

- Framework: Next.js (inferred from Vercel hosting), providing a web interface for user interaction.
- Deployment: Hosted on Vercel at https://cyrus-4txqse03a-cenwadikes-projects.vercel.app/.
- Components: Dashboard for viewing trades, PnL, and managing trading parameters (assumed based on API functionality).

### Backend

- Language: Python 3.12.7 (managed via virtual environment).
- Core Logic:
    - Technical analysis (ICT, Elliott Wave, EMA, RSI, Wyckoff) for price predictions.
    - Fundamental analysis using tokenomics, on-chain data, and TVL trends.
    - Market sentiment analysis via social volume, whale activity, and funding rates.
- APIs: Flask-based API (running at http://0.0.0.0:5000) for user management, trade execution, and analytics.
- Database: PostgreSQL with tables for users, sessions, trades, and platform stats (schema defined in schema.sql).
- Security: Rate limiting, CORS, encrypted wallet seeds, session-based authentication.

### Blockchain Layer

- Cosmos Hub: Generates user accounts and processes ATOM transactions.
- Injective: Executes futures trades for Cosmos ecosystem tokens, integrated via API or SDK.
- Account Management: Automatically creates Cosmos and Injective wallet addresses with encrypted seeds stored in PostgreSQL.

### Data Flow

- User signs signin via the /signup API, generating Cosmos Hub and Injective accounts.
- Trading logic analyzes market data (technical, fundamental, sentiment) using weights stored in the database.
- Trades are executed on Injective futures, with details logged in PostgreSQL.
- The frontend or API provides real-time updates on trades, PnL, and platform stats.

## Prerequisites

- **Python 3.12.7**
- **PostgreSQL** with `psql` CLI
- **API Keys**: X API, Secret AI, CoinGecko (optional)

## Local Setup with PostgreSQL and `psql` CLI
1. **Clone Repository**
   ```bash
   git clone https://github.com/Dayotafiq/Cyrus-Secrete-Trading-Agent.git
   cd cosmos-trading-agent

2. **Set Up Virtual Environment**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux/Mac
    venv\Scripts\activate     # Windows

3. **Install Dependencies**
    ```bash
    pip install -r requirements.txt

4. **Install and Configure PostgreSQL**
    - Install PostgreSQL:
        - Ubuntu: `sudo apt-get install postgresql postgresql-contrib`
        - Mac: `brew install postgresql`
        - Windows: Download from PostgreSQL Official Site
    - Start PostgreSQL service:
        - Ubuntu: `sudo service postgresql start`
        - Mac: `brew services start postgresql`
        - Windows: Start via Services app or `pg_ctl -D "C:\Program Files\PostgreSQL\<version>\data" start`
    - Log in to `psql`:
        ```bash
        psql -U postgres

    - Create a user and database:
    ```sql
    CREATE USER your_db_user WITH PASSWORD 'your_db_password';
    CREATE DATABASE cosmos_trading;
    GRANT ALL PRIVILEGES ON DATABASE cosmos_trading TO your_db_user;
    \c cosmos_trading

5. **Set Up Database Schema Using psql**
    - Create a file schema.sql with the following content:
        ```sql
        CREATE TABLE users (
            user_id SERIAL PRIMARY KEY,
            wallet_address VARCHAR(50) UNIQUE NOT NULL,
            wallet_seed BYTEA NOT NULL,
            total_capital DECIMAL NOT NULL,
            paused BOOLEAN DEFAULT FALSE,
            indicators JSONB,
            weights JSONB,
            bridged_capital DECIMAL DEFAULT 0,
            active_capital DECIMAL DEFAULT 0
        );

        CREATE TABLE sessions (
            session_id VARCHAR(36) PRIMARY KEY,
            user_id INT REFERENCES users(user_id),
            expires_at TIMESTAMP NOT NULL
        );

        CREATE TABLE trades (
            trade_id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(user_id),
            token VARCHAR(20),
            direction VARCHAR(10),
            entry_time TIMESTAMP,
            exit_time TIMESTAMP,
            profit DECIMAL,
            entry_price DECIMAL,
            exit_price DECIMAL,
            factor_scores JSONB
        );

        CREATE TABLE platform_stats (
            stat_id SERIAL PRIMARY KEY,
            indicator VARCHAR(50),
            total_trades INT DEFAULT 0,
            total_profit DECIMAL DEFAULT 0,
            correct_predictions INT DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (indicator)
        );
    
    - Apply the schema:
        ```bash
        psql -U your_db_user -d cosmos_trading -f schema.sql

6. **Set Up Environment Variables**
    - Copy .env.example to .env:
        ```bash
        cp .env.example .env

    - Edit .env with your credentials:
        ```text
        DB_USER=your_db_user
        DB_PASSWORD=your_db_password
        SECRET_KEY=your_random_secret_key
        X_API_KEY=your_x_api_key
        X_API_SECRET=your_x_api_secret
        SECRET_AI_API_KEY=your_secret_ai_key

7. **Run Application**
    ```bash
    python app.py

    - API runs at http://0.0.0.0:5000.

8. **Test APIs**
    - **Signup** (Generates Cosmos Hub and Injective accounts):
        ```bash
        curl -X POST http://localhost:5000/signup \
        -H "Content-Type: application/json" \
        -d '{
            "signature": {"signature": "hex_signature", "pub_key": {"value": "hex_pubkey"}},
            "nonce": "your_nonce",
            "timestamp": "2025-03-10T12:00:00Z"
        }'

    - Response includes `session_id`, `cosmos_address`, `injective_address`, and `wallet_seed`. Store the seed securely.

    - **Get User Config**:
        ```bash
        curl -X GET http://localhost:5000/users/config -H "session_id: your_session_id"
    
    - Respons include the following:
        ```json
        {
            "technical_analysis": {
                "ict": {"weight": 0.25, "description": "Institutional Candle Theory framework"},
                "elliott": {"weight": 0.20, "description": "Wave pattern analysis"},
                "ema": {"weight": 0.15, "description": "EMA crossovers and trends"},
                "rsi": {"weight": 0.15, "description": "Relative Strength Index"},
                "wyckoff": {"weight": 0.25, "description": "Market structure analysis"}
            },
            "fundamental_analysis": {
                "tokenomics": {"weight": 0.30, "description": "Token supply and distribution metrics"},
                "onchain": {"weight": 0.25, "description": "Network usage and transaction volume"},
                "ecosystem": {"weight": 0.25, "description": "Development activity and adoption"},
                "tvl": {"weight": 0.20, "description": "Total Value Locked growth patterns"}
            },
            "market_sentiment": {
                "social": {"weight": 0.20, "description": "Mentions across social platforms"},
                "whale": {"weight": 0.30, "description": "Large holder activity"},
                "market": {"weight": 0.25, "description": "Overall market mood and direction"},
                "funding": {"weight": 0.25, "description": "Perpetual swap funding rates"}
            },
            "total_weight": 1.0
        }

    - **Update Weights**
        ```bash
        curl -X POST http://localhost:5000/users/update-weights \
        -H "Content-Type: application/json" \
        -H "session_id: your_session_id" \
        -d '{
            "weights": {
            "ict": 0.30,
            "elliott": 0.15,
            "ema": 0.10,
            "rsi": 0.20,
            "wyckoff": 0.25,
            "tokenomics": 0.25,
            "onchain": 0.20,
            "ecosystem": 0.30,
            "tvl": 0.25,
            "social": 0.25,
            "whale": 0.25,
            "market": 0.20,
            "funding": 0.30
            }
        }'

## Future Plans and Roadmap

Cyrus AI is poised for growth as a leading trading agent within the Cosmos ecosystem, 
with plans to enhance functionality and adoption:

### Short-Term (Post-Hackathon, Q2 2025)

- Testing: Validate trading strategies and security features on Injective testnet.
- Documentation: Expand API docs and provide user guides for setup and trading.

### Medium-Term (Q3-Q4 2025)

- Advanced Analytics: Add real-time charting and predictive models for technical indicators.
- Multi-Chain Support: Extend trading to other Cosmos-based DEXs or futures platforms via IBC.
- Mobile Access: Develop a mobile app or responsive UI for on-the-go trading.

### Long-Term (2026 and Beyond)
- AI Optimization: Train machine learning models to refine trading weights dynamically.
- Governance: Introduce a token for platform governance and profit-sharing.
- Ecosystem Integration: Partner with Cosmos projects to list additional tokens and enhance 
liquidity.

## How it Leverages Cosmos Technologies

Cyrus AI integrates with the Cosmos ecosystem by leveraging Cosmos Hub accounts and Injective, a 
Cosmos-based DeFi platform, while focusing on Cosmos ecosystem tokens:

1. Cosmos Hub (ATOM and Accounts)
- Use Case: Generates user accounts and potentially uses ATOM for fees or bridging capital to 
Injective.
- Implementation: Signup API creates Cosmos Hub addresses, storing encrypted seeds for user 
access.
- Benefit: Ties Cyrus AI to the Cosmos ecosystem, enabling seamless account management and token 
interactions.

2. Injective (Cosmos-Based DeFi Platform)
- Use Case: Executes futures trades for Cosmos ecosystem tokens.
- Implementation: Integrates with Injective’s SDK to place and manage trades.
- Benefit: Utilizes Injective’s high-performance trading capabilities within the Cosmos ecosystem.

## Conclusion

Cyrus AI delivers a sophisticated trading agent for Cosmos ecosystem tokens on Injective futures, 
blending advanced analytics with user-friendly APIs. By leveraging Cosmos Hub accounts and 
Injective’s infrastructure, it bridges traditional trading strategies with decentralized finance. 
We’re excited to evolve this project and invite the Naija HackATOM community to contribute!

Explore the project at https://github.com/Dayotafiq/Cyrus-Secrete-Trading-Agent or try the demo at https://cyrus-4txqse03a-cenwadikes-projects.vercel.app/.
