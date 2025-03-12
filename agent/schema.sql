CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(50) UNIQUE NOT NULL,
    wallet_seed BYTEA NOT NULL,
    total_capital DECIMAL NOT NULL,
    paused BOOLEAN DEFAULT FALSE,
    indicators JSONB,
    weights JSONB,
    bridged_capital DECIMAL DEFAULT 0,
    active_capital DECIMAL DEFAULT 0,
    created_at TIMESTAMP NOT NULL
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