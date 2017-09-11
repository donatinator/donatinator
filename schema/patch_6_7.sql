-- ----------------------------------------------------------------------------

-- table: account
CREATE TABLE account (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    stripe_cus      TEXT UNIQUE,
    title           TEXT NOT NULL,
    password        TEXT NOT NULL,

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER account_update BEFORE UPDATE ON account
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- insert an 'Admin' user that no-one can log in as, only used for USERNAME/PASSWORD env vars
INSERT INTO account(email, title, password) VALUES('admin', 'Admin', '');

-- insert a 'Stripe' user that no-one can log in as
INSERT INTO account(email, title, password) VALUES('stripe', 'Stripe', '');

-- table: event
CREATE TABLE event (
    id              TEXT NOT NULL PRIMARY KEY, -- either the `req.id` from us, or the event id from Stripe ('evt_00000000000000')
    account_id      INTEGER NOT NULL REFERENCES account,
    payload         JSON NOT NULL,

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER event_update BEFORE UPDATE ON event
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- ----------------------------------------------------------------------------
