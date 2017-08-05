-- ----------------------------------------------------------------------------

-- table: interval.
-- This is a system table and won't be updated by the admins or the users, only
-- by any patch updates if necessary.
CREATE TABLE interval (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,
    name            TEXT UNIQUE NOT NULL,
    show            BOOLEAN NOT NULL,
    position        INTEGER UNIQUE NOT NULL,

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER interval_update BEFORE UPDATE ON interval
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- Note: 'none' means this is for single donations.
INSERT INTO
    interval(name, show, position)
VALUES
    ('none', true, 1),
    ('day', true, 2),
    ('week', true, 3),
    ('month', true, 4),
    ('year', true, 5)
;

-- table: plan
-- Note: if 'interval' is 'none', then it means this is for single donations.
CREATE TABLE plan (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,
    interval_id     INTEGER NOT NULL REFERENCES interval,
    name            TEXT UNIQUE NOT NULL, -- e.g. 'rata', 'piwakawaka', 'bronze', 'hillary', 'lomu'.
    title           TEXT NOT NULL, -- e.g. 'Rata', 'Piwakawaka', 'Bronze', 'Hillary', 'Lomu'.
    description     TEXT NOT NULL DEFAULT '',
    amount          INTEGER NOT NULL, -- e.g. 1000 for $10, or 2500 for $25.
    currency        TEXT NOT NULL, -- e.g. 'nzd', 'aud', 'usd', whatever `setting.currency` was when the plan was created
    active          BOOLEAN NOT NULL DEFAULT true,

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER plan_update BEFORE UPDATE ON plan
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- ----------------------------------------------------------------------------
