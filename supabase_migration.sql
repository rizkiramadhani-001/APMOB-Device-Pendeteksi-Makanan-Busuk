-- ==========================================
-- SUPABASE DATABASE MIGRATION SCRIPT
-- AquaAir Dash - Food Freshness Detector App
-- ==========================================
-- This migration script establishes user-device persistence and registers
-- owner-associated sensor telemetry by creating the 'registered_devices' table
-- and injecting a foreign key reference into the 'sensor_history' table.
--
-- INSTRUCTIONS FOR USE:
-- 1. Copy the entire contents of this file.
-- 2. Go to your Supabase Dashboard (https://supabase.com).
-- 3. Click on the "SQL Editor" tab on the left navigation menu.
-- 4. Click "+ New Query" (or "New blank query").
-- 5. Paste the copied SQL code here.
-- 6. Click the "Run" button at the bottom-right of the SQL editor.
-- ==========================================

-- ------------------------------------------
-- Step 1: Create 'registered_devices' Table
-- ------------------------------------------
-- This table maps paired Bluetooth hardware 'device_id' values
-- directly to owners registered in the 'users' table.
CREATE TABLE IF NOT EXISTS public.registered_devices (
    device_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment to describe table purpose in database schema
COMMENT ON TABLE public.registered_devices IS 'Stores paired food detector devices associated with authenticated users.';

-- ------------------------------------------
-- Step 2: Alter 'sensor_history' Table
-- ------------------------------------------
-- Inject 'user_id' as a foreign key constraint pointing to the
-- 'users' table, allowing queries to filter historical telemetry by owner.
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

-- ------------------------------------------
-- Step 3: Optimize Performance with Indices
-- ------------------------------------------
-- Create indexes on foreign keys to drastically accelerate join queries
-- and speed up owner-scoped history retrieval.

-- Index for searching devices by user
CREATE INDEX IF NOT EXISTS idx_registered_devices_user_id 
ON public.registered_devices(user_id);

-- Index for retrieving historical telemetry by user
CREATE INDEX IF NOT EXISTS idx_sensor_history_user_id 
ON public.sensor_history(user_id);

-- Index for retrieving historical telemetry by device
CREATE INDEX IF NOT EXISTS idx_sensor_history_device_id 
ON public.sensor_history(device_id);

-- ==========================================
-- MIGRATION SCRIPT COMPLETED
-- ==========================================
