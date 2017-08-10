-- ----------------------------------------------------------------------------

-- table: gift
-- Note: this table is used for the one-off single donation plans. The recurring subscriptions
-- are stored in Stripe itself. Unlike other tables which use id (integer), name, and title,
-- this table uses id (text), and name, similar to how Stripe names things.
CREATE TABLE gift (
    id              TEXT PRIMARY KEY NOT NULL, -- e.g. 'rata', 'piwakawaka', 'bronze', 'hillary', 'lomu'.
    name            TEXT NOT NULL, -- e.g. 'Rata', 'Piwakawaka', 'Bronze', 'Hillary', 'Lomu'.
    description     TEXT NOT NULL DEFAULT '',
    amount          INTEGER NOT NULL, -- e.g. 1000 for $10, or 2500 for $25.
    currency        TEXT NOT NULL, -- e.g. 'nzd', 'aud', 'usd', whatever `setting.currency` was when the gift was created
    statement       TEXT NOT NULL, -- e.g. 'FRESH WATER RATA'

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER gift_update BEFORE UPDATE ON gift
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- ----------------------------------------------------------------------------
