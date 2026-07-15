CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator_pass';

CREATE TABLE IF NOT EXISTS ticks (
    id          BIGSERIAL PRIMARY KEY,
    symbol      TEXT NOT NULL,
    price       NUMERIC(12, 4) NOT NULL,
    volume      INT NOT NULL,
    tick_ts     TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);
