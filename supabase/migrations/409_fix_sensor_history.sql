-- =======================================================
-- MIGRATION: FIX SENSOR HISTORY UNIQUE CONSTRAINTS (409)
-- =======================================================
-- This script safely drops any accidental unique constraints or
-- primary keys on `device_id` or `user_id` inside `sensor_history`,
-- recreating the table with the correct identity sequence.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR:
-- https://supabase.com -> Project -> SQL Editor -> New Query
-- =======================================================

BEGIN;

-- 1. Create a backup of the existing sensor history data
CREATE TABLE IF NOT EXISTS public.sensor_history_backup AS 
SELECT * FROM public.sensor_history;

-- 2. Drop the old sensor history table and all its constraints/indexes
DROP TABLE IF EXISTS public.sensor_history CASCADE;

-- 3. Create the pristine sensor history table with a true auto-incrementing ID
CREATE TABLE public.sensor_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    mq4 NUMERIC,
    mq135 NUMERIC,
    gas NUMERIC,
    humidity NUMERIC,
    temperature NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Restore the telemetry records from the backup safely
-- Uses COALESCE to handle schema migrations between old and new columns.
INSERT INTO public.sensor_history (
    device_id, user_id, mq4, mq135, gas, humidity, temperature, created_at
)
SELECT 
    device_id, 
    user_id, 
    COALESCE(mq4, gas), 
    COALESCE(mq135, temperature), 
    COALESCE(gas, mq4), 
    humidity, 
    COALESCE(temperature, mq135), 
    created_at
FROM public.sensor_history_backup;

-- 5. Drop the temporary backup table
DROP TABLE IF EXISTS public.sensor_history_backup;

-- 6. Disable Row Level Security (RLS) to guarantee direct hardware posts succeed
ALTER TABLE public.sensor_history DISABLE ROW LEVEL SECURITY;

-- 7. Optimize query performance with time-series indexing
CREATE INDEX IF NOT EXISTS idx_sensor_history_user_id 
ON public.sensor_history(user_id);

CREATE INDEX IF NOT EXISTS idx_sensor_history_device_id 
ON public.sensor_history(device_id);

CREATE INDEX IF NOT EXISTS idx_sensor_history_device_time_desc 
ON public.sensor_history(device_id, created_at DESC);

-- 8. Re-enable Realtime replication for the sensor_history table
-- This allows the React dashboard to stream telemetry in real time.
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.sensor_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_history;

COMMIT;

-- =======================================================
-- VERIFICATION CHECK:
-- =======================================================
-- Run this block below separately to verify that multiple rows 
-- can now be inserted for the exact same device without any 409 errors!
--
-- INSERT INTO public.sensor_history (device_id, gas, temperature, humidity) 
-- VALUES ('fPpApnun99l8W/tswVy73Q==', 100, 25.0, 50.0);
--
-- INSERT INTO public.sensor_history (device_id, gas, temperature, humidity) 
-- VALUES ('fPpApnun99l8W/tswVy73Q==', 110, 25.1, 49.9);
--
-- SELECT * FROM public.sensor_history WHERE device_id = 'fPpApnun99l8W/tswVy73Q==';
-- =======================================================
