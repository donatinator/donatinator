-- ----------------------------------------------------------------------------

-- infrastructure
CREATE TABLE base (
    inserted        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE FUNCTION updated() RETURNS trigger as '
   BEGIN
      NEW.updated := CURRENT_TIMESTAMP;
      RETURN NEW;
   END;
' LANGUAGE plpgsql;

-- aggregates
CREATE FUNCTION append_text(TEXT, TEXT)
RETURNS TEXT AS '
    SELECT CASE WHEN $1 = '''' THEN
        $2
    ELSE
        $1 || '', '' || $2
    END;'
LANGUAGE 'sql' IMMUTABLE STRICT;

CREATE AGGREGATE list (
    BASETYPE = TEXT,
    SFUNC    = append_text,
    STYPE    = TEXT,
    INITCOND = ''
);

CREATE FUNCTION append_text(TEXT, INTEGER)
RETURNS TEXT AS '
    SELECT CASE WHEN $1 = '''' THEN
        $2::TEXT
    ELSE
        $1::TEXT || '', '' || $2::TEXT
    END;'
LANGUAGE 'sql' IMMUTABLE STRICT;

CREATE AGGREGATE list (
    BASETYPE = INTEGER,
    SFUNC    = append_text,
    STYPE    = TEXT,
    INITCOND = ''
);

-- sequence: object_id_seq;
CREATE SEQUENCE object_id_seq;

-- ----------------------------------------------------------------------------
