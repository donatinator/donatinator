-- ----------------------------------------------------------------------------

-- table: page
CREATE TABLE page (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,
    name            TEXT UNIQUE NOT NULL, -- e.g. "index", "about", "help", "contact"
    title           TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    html            TEXT NOT NULL DEFAULT '',
    position        INTEGER UNIQUE, -- 0 = not in menu, n = in that order

    LIKE base       INCLUDING DEFAULTS
);
CREATE TRIGGER page_update BEFORE UPDATE ON page
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- just insert an 'index' and a 'thanks' page
INSERT INTO page(name, title) VALUES('index', 'Index');
INSERT INTO page(name, title) VALUES('thanks', 'Thanks');

-- ----------------------------------------------------------------------------
