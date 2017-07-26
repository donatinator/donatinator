-- ----------------------------------------------------------------------------

-- table: setting
CREATE TABLE setting (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,
    key             TEXT UNIQUE NOT NULL,
    value           TEXT NOT NULL DEFAULT '',

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER setting_updated BEFORE UPDATE ON setting
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- ----------------------------------------------------------------------------
