/*
# QueryMind: Fix run_readonly_query JSON conversion

## Overview
Replaces the `run_readonly_query` function body so it wraps the user's SELECT
in `SELECT json_agg(row_to_json(q)) FROM (<query>) q` to produce a JSON array,
instead of trying to bind row output directly into a json variable (which
caused "invalid input syntax for type json").

## Security
- Same read-only validation (SELECT/WITH only, forbidden keywords, single statement).
- SECURITY DEFINER, statement timeout 15s.
- No data mutation.
*/

CREATE OR REPLACE FUNCTION run_readonly_query(p_sql text)
RETURNS TABLE(rows json, row_count integer, execution_ms integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean     text;
  v_upper     text;
  v_start     timestamp;
  v_end       timestamp;
  v_rows      json;
  v_count     integer;
  v_elapsed   integer;
  v_forbidden text[] := ARRAY[
    'INSERT','UPDATE','DELETE','DROP','ALTER','TRUNCATE','CREATE',
    'GRANT','REVOKE','MERGE','COPY','VACUUM','EXECUTE','CALL',
    'REFRESH','REINDEX','CLUSTER','ANALYZE'
  ];
  v_kw text;
BEGIN
  v_clean := trim(trailing from p_sql);
  IF right(v_clean, 1) = ';' THEN
    v_clean := trim(trailing ';' from v_clean);
  END IF;
  v_clean := trim(v_clean);
  v_upper := upper(v_clean);

  IF position(';' in v_clean) > 0 THEN
    RAISE EXCEPTION 'BLOCKED: Multiple statements are not allowed in read-only mode.';
  END IF;

  IF NOT (v_upper LIKE 'SELECT%' OR v_upper LIKE 'WITH%') THEN
    RAISE EXCEPTION 'BLOCKED: Only SELECT statements are allowed in read-only mode.';
  END IF;

  FOREACH v_kw IN ARRAY v_forbidden LOOP
    IF v_upper ~ ('(^|[^A-Z_])' || v_kw || '([^A-Z_]|$)') THEN
      RAISE EXCEPTION 'BLOCKED: Forbidden keyword "%" detected in read-only mode.', v_kw;
    END IF;
  END LOOP;

  PERFORM set_config('statement_timeout', '15000', false);
  v_start := clock_timestamp();

  EXECUTE format('SELECT json_agg(row_to_json(q)) FROM (%s) q', v_clean) INTO v_rows;

  v_end := clock_timestamp();
  v_elapsed := extract(epoch FROM (v_end - v_start)) * 1000;

  IF v_rows IS NULL THEN
    v_rows := '[]'::json;
    v_count := 0;
  ELSE
    SELECT count(*) INTO v_count FROM json_array_elements(v_rows);
  END IF;

  PERFORM set_config('statement_timeout', '0', false);

  RETURN QUERY SELECT v_rows, v_count, v_elapsed;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('statement_timeout', '0', false);
  RAISE;
END;
$$;
