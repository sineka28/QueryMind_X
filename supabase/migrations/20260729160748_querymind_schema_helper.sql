/*
# QueryMind: Schema discovery helper function

## Overview
Adds a SECURITY DEFINER function `get_schema_info()` that returns all base
tables in the public schema with their columns, data types, primary keys,
and foreign-key relationships as a single JSON payload. This lets the edge
function read the live schema via an RPC call (PostgREST cannot query
information_schema directly through the service-role client).

## Security
- SECURITY DEFINER so it can read catalog tables regardless of caller role.
- Read-only: only SELECTs from information_schema and pg_catalog.
- No parameters, no mutation.
*/

CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'tables', (
      SELECT json_agg(
        json_build_object(
          'table_name', t.table_name,
          'columns', (
            SELECT json_agg(
              json_build_object(
                'column_name', c.column_name,
                'data_type', c.data_type,
                'is_nullable', c.is_nullable
              )
              ORDER BY c.ordinal_position
            )
            FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = t.table_name
          ),
          'primary_keys', (
            SELECT json_agg(kcu.column_name)
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema = tc.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = t.table_name
              AND tc.constraint_type = 'PRIMARY KEY'
          ),
          'foreign_keys', (
            SELECT json_agg(
              json_build_object(
                'column_name', kcu.column_name,
                'references_table', ccu.table_name,
                'references_column', ccu.column_name
              )
            )
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema = tc.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = t.table_name
              AND tc.constraint_type = 'FOREIGN KEY'
          )
        )
        ORDER BY t.table_name
      )
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    )
  );
$$;
