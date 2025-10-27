-- Fix order number sequence after data migration
-- This resets the sequence to start from the highest existing order number + 1

-- Get the current maximum order_number and set the sequence to start from there
SELECT setval('orders_order_number_seq', COALESCE((SELECT MAX(order_number) FROM orders), 0) + 1, false);
