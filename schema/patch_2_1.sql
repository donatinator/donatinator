-- ----------------------------------------------------------------------------

-- sequence: object
DROP SEQUENCE object_id_seq;

-- aggregates
DROP AGGREGATE list(INTEGER);
DROP FUNCTION append_text(TEXT, INTEGER);
DROP AGGREGATE list(TEXT);
DROP FUNCTION append_text(TEXT, TEXT);

-- infrastructure
DROP FUNCTION updated();
DROP TABLE base;

-- ----------------------------------------------------------------------------
