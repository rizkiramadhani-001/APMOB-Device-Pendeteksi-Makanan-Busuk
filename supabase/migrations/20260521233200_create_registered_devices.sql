-- ==========================================
-- AQUAAIR DASH & APMOB FOOD DETECTOR
-- COMPREHENSIVE UNIFIED DATABASE MIGRATION
-- ==========================================
-- This script sets up the complete Postgres database schema for the 
-- Food Freshness Detector App from scratch. It builds the auth/user table,
-- device registration, sensor telemetry logs, indexing, and real-time.
--
-- INSTRUCTIONS FOR USE:
-- 1. Copy the entire contents of this script.
-- 2. Go to your Supabase Dashboard: https://supabase.com
-- 3. Navigate to the "SQL Editor" tab on the left-side panel.
-- 4. Click "+ New Query" (or "New blank query").
-- 5. Paste the entire SQL block here.
-- 6. Click the "Run" button at the bottom-right.
-- ==========================================

-- ------------------------------------------
-- Step 1: Enable Core Extensions
-- ------------------------------------------
-- Enables standard UUID generation algorithms
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------
-- Step 2: Create 'users' Table
-- ------------------------------------------
-- Stores credentials and user profiles for the custom dashboard login system
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Stores credentials and profiles for authenticated dashboard users.';

-- ------------------------------------------
-- Step 3: Create 'registered_devices' Table
-- ------------------------------------------
-- Maps Bluetooth hardware device_ids directly to their registered user accounts
CREATE TABLE IF NOT EXISTS public.registered_devices (
    device_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.registered_devices IS 'Stores paired food detector devices associated with authenticated users.';

-- ------------------------------------------
-- Step 4: Create 'sensor_history' Table
-- ------------------------------------------
-- Holds all historical telemetry records submitted by physical ESP32 boards
CREATE TABLE IF NOT EXISTS public.sensor_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT NOT NULL,
    gas NUMERIC,
    humidity NUMERIC,
    temperature NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sensor_history IS 'Stores historical sensor readings for food spoilage detection.';

-- Safely append user_id foreign key if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sensor_history' 
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.sensor_history 
        ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Safely append mq4 (Raw Methane analog PPM) if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sensor_history' 
          AND column_name = 'mq4'
    ) THEN
        ALTER TABLE public.sensor_history 
        ADD COLUMN mq4 NUMERIC;
    END IF;
END $$;

-- Safely append mq135 (Raw Air Quality analog PPM) if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sensor_history' 
          AND column_name = 'mq135'
    ) THEN
        ALTER TABLE public.sensor_history 
        ADD COLUMN mq135 NUMERIC;
    END IF;
END $$;

-- ------------------------------------------
-- Step 5: Disable Row Level Security (RLS)
-- ------------------------------------------
-- Disables RLS limits on public tables to allow direct hardware POSTs
-- and simplified user auth queries without extra policy boilerplate.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_history DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- Step 6: Optimize Performance with Indexes
-- ------------------------------------------
-- Builds B-Tree indexes on keys to speed up dashboard queries and jointures.
CREATE INDEX IF NOT EXISTS idx_registered_devices_user_id 
ON public.registered_devices(user_id);

CREATE INDEX IF NOT EXISTS idx_sensor_history_user_id 
ON public.sensor_history(user_id);

CREATE INDEX IF NOT EXISTS idx_sensor_history_device_id 
ON public.sensor_history(device_id);

-- Speed up time-series chart querying (last 25 readings per device)
CREATE INDEX IF NOT EXISTS idx_sensor_history_device_time_desc
ON public.sensor_history(device_id, created_at DESC);

-- ------------------------------------------
-- Step 7: Enable Postgres Realtime Replication
-- ------------------------------------------
-- Tells Supabase to stream insertions on sensor_history dynamically
-- to the React dashboard over WebSocket.
BEGIN;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.sensor_history;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_history;
COMMIT;

-- ==========================================
-- END OF COMPLETE MIGRATION SCRIPT
-- ==========================================
