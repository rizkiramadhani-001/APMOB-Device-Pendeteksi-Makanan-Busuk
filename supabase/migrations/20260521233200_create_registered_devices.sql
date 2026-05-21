-- ==========================================
-- AquaAir Dash - Database Migration
-- ==========================================
-- This migration script establishes user-device persistence and registers
-- owner-associated sensor telemetry by creating the 'registered_devices' table
-- and injecting a foreign key reference into the 'sensor_history' table.

-- 1. Create 'registered_devices' Table
CREATE TABLE IF NOT EXISTS public.registered_devices (
    device_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.registered_devices IS 'Stores paired food detector devices associated with authenticated users.';

-- 2. Alter 'sensor_history' Table to add user_id referencing public.users(id)
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

-- 3. Create Indices to accelerate queries
CREATE INDEX IF NOT EXISTS idx_registered_devices_user_id ON public.registered_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_history_user_id ON public.sensor_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_history_device_id ON public.sensor_history(device_id);
