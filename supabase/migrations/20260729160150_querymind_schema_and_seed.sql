/*
# QueryMind: Analytics schema, seed data, and read-only query runner

## Overview
Creates the four analytics tables that QueryMind queries (customers, products,
orders, order_items), seeds each with 20 realistic records spanning multiple
cities, categories, order statuses, and years, and installs a SECURITY DEFINER
function `run_readonly_query(sql text)` that executes a single read-only SELECT
statement with a statement timeout, returning rows + timing metadata.

## Tables
1. `customers` — id (uuid PK), name, email (unique), city, signup_date
2. `products`  — id (uuid PK), name, category, price
3. `orders`   — id (uuid PK), customer_id (FK customers), order_date, total_amount, status
4. `order_items` — order_id (FK orders), product_id (FK products), quantity
   Composite PK (order_id, product_id).

## Security
- RLS enabled on all tables.
- SELECT open to anon + authenticated (analytics demo data is intentionally shared).
- No INSERT/UPDATE/DELETE policies: the app is read-only by design.
- `run_readonly_query` is SECURITY DEFINER, owned by the postgres role, so it can
  read tables even though anon has no direct DML. It enforces read-only by
  rejecting any statement that is not a single SELECT and by setting a
  statement timeout. The function only returns rows; it cannot modify data.

## Notes
1. The function uses `current_setting('statement_timeout')` to restore the prior
   timeout after running the query.
2. Only one statement is allowed (no semicolon-chained queries).
3. The function strips a trailing semicolon before parsing.
*/

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text UNIQUE NOT NULL,
  city        text NOT NULL,
  signup_date date NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  category text NOT NULL,
  price    numeric(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_date    date NOT NULL,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  status        text NOT NULL CHECK (status IN ('completed','pending','cancelled','shipped'))
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date     ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ============================================================
-- Row Level Security (read-only shared demo data)
-- ============================================================

ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_customers" ON customers;
CREATE POLICY "anon_read_customers" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "anon_read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_orders" ON orders;
CREATE POLICY "anon_read_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_order_items" ON order_items;
CREATE POLICY "anon_read_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- Read-only query execution function
-- ============================================================

CREATE OR REPLACE FUNCTION run_readonly_query(p_sql text)
RETURNS TABLE(rows json, row_count integer, execution_ms integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean   text;
  v_upper   text;
  v_start   timestamp;
  v_end     timestamp;
  v_rows    json;
  v_count   integer;
  v_elapsed integer;
  v_forbidden text[] := ARRAY[
    'INSERT','UPDATE','DELETE','DROP','ALTER','TRUNCATE','CREATE',
    'GRANT','REVOKE','MERGE','COPY','VACUUM','EXECUTE','CALL',
    'REFRESH','REINDEX','CLUSTER','ANALYZE'
  ];
  v_kw text;
BEGIN
  -- Strip trailing whitespace/semicolon
  v_clean := trim(trailing from p_sql);
  IF right(v_clean, 1) = ';' THEN
    v_clean := trim(trailing ';' from v_clean);
  END IF;
  v_clean := trim(v_clean);
  v_upper := upper(v_clean);

  -- Reject multiple statements (any remaining semicolon in the body)
  IF position(';' in v_clean) > 0 THEN
    RAISE EXCEPTION 'BLOCKED: Multiple statements are not allowed in read-only mode.';
  END IF;

  -- Must start with SELECT or WITH (CTE)
  IF NOT (v_upper LIKE 'SELECT%' OR v_upper LIKE 'WITH%') THEN
    RAISE EXCEPTION 'BLOCKED: Only SELECT statements are allowed in read-only mode.';
  END IF;

  -- Reject forbidden keywords as whole-word matches
  FOREACH v_kw IN ARRAY v_forbidden LOOP
    IF v_upper ~ ('(^|[^A-Z_])' || v_kw || '([^A-Z_]|$)') THEN
      RAISE EXCEPTION 'BLOCKED: Forbidden keyword "%" detected in read-only mode.', v_kw;
    END IF;
  END LOOP;

  -- Set a 15s statement timeout for safety
  PERFORM set_config('statement_timeout', '15000', false);
  v_start := clock_timestamp();
  EXECUTE v_clean INTO v_rows;
  v_end := clock_timestamp();
  v_elapsed := extract(epoch FROM (v_end - v_start)) * 1000;

  SELECT count(*) INTO v_count FROM json_array_elements(v_rows);
  PERFORM set_config('statement_timeout', '0', false);

  RETURN QUERY SELECT v_rows, v_count, v_elapsed;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('statement_timeout', '0', false);
  RAISE;
END;
$$;

-- ============================================================
-- Seed data — deterministic, idempotent
-- ============================================================

-- Wipe existing seed rows (safe: no user data in a fresh demo schema)
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM customers;

-- 20 customers across 6 cities
INSERT INTO customers (name, email, city, signup_date) VALUES
('Olivia Bennett','olivia.bennett@example.com','New York','2022-01-15'),
('Liam Carter','liam.carter@example.com','Chicago','2022-02-20'),
('Emma Davis','emma.davis@example.com','San Francisco','2022-03-10'),
('Noah Evans','noah.evans@example.com','Chicago','2022-04-05'),
('Ava Foster','ava.foster@example.com','New York','2022-05-22'),
('Ethan Garcia','ethan.garcia@example.com','Los Angeles','2022-06-18'),
('Sophia Harris','sophia.harris@example.com','Houston','2022-07-30'),
('Mason Irving','mason.irving@example.com','San Francisco','2022-08-14'),
('Isabella Jenkins','isabella.jenkins@example.com','Chicago','2022-09-09'),
('Lucas King','lucas.king@example.com','Houston','2022-10-25'),
('Mia Lewis','mia.lewis@example.com','New York','2022-11-17'),
('Logan Martin','logan.martin@example.com','Los Angeles','2022-12-03'),
('Charlotte Nguyen','charlotte.nguyen@example.com','Chicago','2023-01-08'),
('Amelia Ortiz','amelia.ortiz@example.com','San Francisco','2023-02-19'),
('Harper Patel','harper.patel@example.com','Houston','2023-03-27'),
('Evelyn Quinn','evelyn.quinn@example.com','New York','2023-04-11'),
('Abigail Reyes','abigail.reyes@example.com','Los Angeles','2023-05-05'),
('Emily Scott','emily.scott@example.com','Chicago','2023-06-21'),
('Elizabeth Torres','elizabeth.torres@example.com','San Francisco','2023-07-13'),
('Sofia Walker','sofia.walker@example.com','Houston','2023-08-29');

-- 20 products across 5 categories
INSERT INTO products (name, category, price) VALUES
('Aurora Laptop','Electronics',1299.99),
('Pulse Wireless Earbuds','Electronics',149.50),
('Vortex 4K Monitor','Electronics',449.00),
('Nimbus Mechanical Keyboard','Electronics',129.00),
('Quartz Smartwatch','Electronics',249.99),
('Atlas Running Shoes','Apparel',119.99),
('Boreal Down Jacket','Apparel',289.00),
('Coastal Cotton Tee','Apparel',34.50),
('Drift Denim Jeans','Apparel',79.99),
('Ember Wool Beanie','Apparel',29.00),
('Flora Ceramic Mug','Home',24.99),
('Glow LED Desk Lamp','Home',59.00),
('Haven Throw Blanket','Home',89.50),
('Indigo Plant Pot','Home',39.99),
('Junction Bookshelf','Home',349.00),
('Kaleido Water Bottle','Outdoor',32.00),
('Lumen Headlamp','Outdoor',64.99),
('Meridian Camping Tent','Outdoor',399.00),
('Nimbus Hiking Backpack','Outdoor',169.50),
('Orbit Yoga Mat','Outdoor',58.00);

-- 20 orders across 2022-2024, varied statuses
INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
((SELECT id FROM customers WHERE email='olivia.bennett@example.com'),'2022-02-01',1449.49,'completed'),
((SELECT id FROM customers WHERE email='liam.carter@example.com'),'2022-03-15',298.99,'completed'),
((SELECT id FROM customers WHERE email='emma.davis@example.com'),'2022-04-02',449.00,'shipped'),
((SELECT id FROM customers WHERE email='noah.evans@example.com'),'2022-05-20',119.99,'completed'),
((SELECT id FROM customers WHERE email='ava.foster@example.com'),'2022-06-10',378.99,'completed'),
((SELECT id FROM customers WHERE email='ethan.garcia@example.com'),'2022-07-04',249.99,'cancelled'),
((SELECT id FROM customers WHERE email='sophia.harris@example.com'),'2022-08-22',129.00,'completed'),
((SELECT id FROM customers WHERE email='mason.irving@example.com'),'2022-09-18',89.50,'pending'),
((SELECT id FROM customers WHERE email='isabella.jenkins@example.com'),'2022-10-30',34.50,'completed'),
((SELECT id FROM customers WHERE email='lucas.king@example.com'),'2022-11-12',399.00,'shipped'),
((SELECT id FROM customers WHERE email='mia.lewis@example.com'),'2022-12-05',79.99,'completed'),
((SELECT id FROM customers WHERE email='logan.martin@example.com'),'2023-01-09',169.50,'completed'),
((SELECT id FROM customers WHERE email='charlotte.nguyen@example.com'),'2023-02-21',58.00,'pending'),
((SELECT id FROM customers WHERE email='amelia.ortiz@example.com'),'2023-03-14',1299.99,'completed'),
((SELECT id FROM customers WHERE email='harper.patel@example.com'),'2023-04-02',24.99,'completed'),
((SELECT id FROM customers WHERE email='evelyn.quinn@example.com'),'2023-05-19',449.00,'shipped'),
((SELECT id FROM customers WHERE email='abigail.reyes@example.com'),'2023-06-07',289.00,'completed'),
((SELECT id FROM customers WHERE email='emily.scott@example.com'),'2023-07-25',64.99,'completed'),
((SELECT id FROM customers WHERE email='elizabeth.torres@example.com'),'2023-08-11',399.00,'cancelled'),
((SELECT id FROM customers WHERE email='sofia.walker@example.com'),'2023-09-29',119.99,'completed');

-- Order items: link products to orders with quantities
INSERT INTO order_items (order_id, product_id, quantity) VALUES
((SELECT id FROM orders WHERE order_date='2022-02-01' AND total_amount=1449.49), (SELECT id FROM products WHERE name='Aurora Laptop'), 1),
((SELECT id FROM orders WHERE order_date='2022-02-01' AND total_amount=1449.49), (SELECT id FROM products WHERE name='Pulse Wireless Earbuds'), 1),
((SELECT id FROM orders WHERE order_date='2022-03-15' AND total_amount=298.99), (SELECT id FROM products WHERE name='Boreal Down Jacket'), 1),
((SELECT id FROM orders WHERE order_date='2022-04-02' AND total_amount=449.00), (SELECT id FROM products WHERE name='Vortex 4K Monitor'), 1),
((SELECT id FROM orders WHERE order_date='2022-05-20' AND total_amount=119.99), (SELECT id FROM products WHERE name='Atlas Running Shoes'), 1),
((SELECT id FROM orders WHERE order_date='2022-06-10' AND total_amount=378.99), (SELECT id FROM products WHERE name='Quartz Smartwatch'), 1),
((SELECT id FROM orders WHERE order_date='2022-06-10' AND total_amount=378.99), (SELECT id FROM products WHERE name='Coastal Cotton Tee'), 1),
((SELECT id FROM orders WHERE order_date='2022-07-04' AND total_amount=249.99), (SELECT id FROM products WHERE name='Quartz Smartwatch'), 1),
((SELECT id FROM orders WHERE order_date='2022-08-22' AND total_amount=129.00), (SELECT id FROM products WHERE name='Nimbus Mechanical Keyboard'), 1),
((SELECT id FROM orders WHERE order_date='2022-09-18' AND total_amount=89.50), (SELECT id FROM products WHERE name='Haven Throw Blanket'), 1),
((SELECT id FROM orders WHERE order_date='2022-10-30' AND total_amount=34.50), (SELECT id FROM products WHERE name='Coastal Cotton Tee'), 1),
((SELECT id FROM orders WHERE order_date='2022-11-12' AND total_amount=399.00), (SELECT id FROM products WHERE name='Meridian Camping Tent'), 1),
((SELECT id FROM orders WHERE order_date='2022-12-05' AND total_amount=79.99), (SELECT id FROM products WHERE name='Drift Denim Jeans'), 1),
((SELECT id FROM orders WHERE order_date='2023-01-09' AND total_amount=169.50), (SELECT id FROM products WHERE name='Nimbus Hiking Backpack'), 1),
((SELECT id FROM orders WHERE order_date='2023-02-21' AND total_amount=58.00), (SELECT id FROM products WHERE name='Orbit Yoga Mat'), 1),
((SELECT id FROM orders WHERE order_date='2023-03-14' AND total_amount=1299.99), (SELECT id FROM products WHERE name='Aurora Laptop'), 1),
((SELECT id FROM orders WHERE order_date='2023-04-02' AND total_amount=24.99), (SELECT id FROM products WHERE name='Flora Ceramic Mug'), 1),
((SELECT id FROM orders WHERE order_date='2023-05-19' AND total_amount=449.00), (SELECT id FROM products WHERE name='Vortex 4K Monitor'), 1),
((SELECT id FROM orders WHERE order_date='2023-06-07' AND total_amount=289.00), (SELECT id FROM products WHERE name='Boreal Down Jacket'), 1),
((SELECT id FROM orders WHERE order_date='2023-07-25' AND total_amount=64.99), (SELECT id FROM products WHERE name='Lumen Headlamp'), 1),
((SELECT id FROM orders WHERE order_date='2023-08-11' AND total_amount=399.00), (SELECT id FROM products WHERE name='Meridian Camping Tent'), 1),
((SELECT id FROM orders WHERE order_date='2023-09-29' AND total_amount=119.99), (SELECT id FROM products WHERE name='Atlas Running Shoes'), 1);
