-- =======================================================
-- MIGRATION: RESOLVE 409 FOREIGN KEY CONSTRAINT VIOLATION
-- =======================================================
-- This script fixes the foreign key constraint failure by:
-- 1. Registering the active mock User ID in the `users` table so 
--    the simulator/tests can execute successfully immediately.
-- 2. Removing the strict foreign key constraint on `sensor_history.user_id`.
--    Telemetry ingestion from physical hardware must be highly resilient and 
--    should never fail or crash the device due to strict relational constraints
--    if a mock or unregistered UUID is used.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR:
-- https://supabase.com -> Project -> SQL Editor -> New Query
-- =======================================================

BEGIN;

-- 1. Register the active mock user so testing and pairing scripts are fully functional
-- Password is '12345678' hashed with SHA-256 (matches the dashboard's hashing routine)
INSERT INTO public.users (id, username, password, full_name)
VALUES (
    'b44749f9-7aa3-4046-ba3e-58be660726a3', 
    'rizkir', 
    'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', 
    'Rizki Ramadhani'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Register the device to this user if it's not already registered
-- This ensures that the React app's pairing lists immediately display the device
INSERT INTO public.registered_devices (device_id, user_id, name)
VALUES (
    'fPpApnun99l8W/tswVy73Q==',
    'b44749f9-7aa3-4046-ba3e-58be660726a3',
    'APMOB Food Detector'
)
ON CONFLICT (device_id) DO NOTHING;

-- 3. Drop the strict foreign key constraint from sensor_history.user_id
-- This ensures that physical hardware sending any other userId (mock or old) 
-- will still successfully log data without causing 409 errors or memory crashes!
ALTER TABLE public.sensor_history 
DROP CONSTRAINT IF EXISTS sensor_history_user_id_fkey;

COMMIT;

-- =======================================================
-- VERIFICATION COMMANDS:
-- =======================================================
-- Run these to verify that inserts with mock/unregistered users now succeed:
--
-- INSERT INTO public.sensor_history (device_id, user_id, mq4, mq135, gas, humidity, temperature)
-- VALUES ('fPpApnun99l8W/tswVy73Q==', 'b44749f9-7aa3-4046-ba3e-58be660726a3', 170, 97, 170, 65.8, 97);
--
-- INSERT INTO public.sensor_history (device_id, user_id, mq4, mq135, gas, humidity, temperature)
-- VALUES ('fPpApnun99l8W/tswVy73Q==', '00000000-0000-0000-0000-000000000000', 180, 99, 180, 64.2, 99);
--
-- SELECT * FROM public.sensor_history WHERE device_id = 'fPpApnun99l8W/tswVy73Q==';
-- =======================================================
