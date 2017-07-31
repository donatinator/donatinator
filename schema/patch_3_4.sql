-- ----------------------------------------------------------------------------

-- table: single_charge
CREATE TABLE single_charge (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,

    -- fields from the `token`
    type            TEXT NOT NULL,            -- e.g. "card"
    token_id        TEXT UNIQUE NOT NULL,     -- e.g. "tok_..."
    client_ip       TEXT NOT NULL DEFAULT '', -- e.g. "1.2.3.4"

    -- fields from the `charge`
    charge_id       TEXT UNIQUE NOT NULL,     -- e.g. "ch_..."
    transaction_id  TEXT UNIQUE NOT NULL,     -- e.g. "txn_..."
    email           TEXT NOT NULL,            -- e.g. "bob@example.com"
    currency        TEXT NOT NULL,            -- e.g. "NZD"
    amount          INTEGER NOT NULL,         -- e.g. "1000"
    status          TEXT NOT NULL,            -- e.g. "succeeded"
    livemode        BOOLEAN NOT NULL,         -- e.g. false (test) / true (live/production)

    -- fields we generated
    ip              TEXT NOT NULL,        -- e.g. "5.6.7.8" (should be the same as `client_ip` above)

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER single_charge_update BEFORE UPDATE ON single_charge
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- ----------------------------------------------------------------------------
