-- Create parking_entries table for the parking management system
-- Run this SQL in your Supabase SQL Editor

-- Enable Row Level Security (RLS) - optional but recommended
-- You can enable this later if you want to add authentication

-- Create the parking_entries table
CREATE TABLE IF NOT EXISTS parking_entries (
    id BIGSERIAL PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMP WITH TIME ZONE NULL,
    payment DECIMAL(10,2) NULL,
    is_overnight BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parking_entries_plate_number ON parking_entries(plate_number);
CREATE INDEX IF NOT EXISTS idx_parking_entries_entry_time ON parking_entries(entry_time);
CREATE INDEX IF NOT EXISTS idx_parking_entries_exit_time ON parking_entries(exit_time);
CREATE INDEX IF NOT EXISTS idx_parking_entries_created_at ON parking_entries(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_parking_entries_updated_at 
    BEFORE UPDATE ON parking_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful comments
COMMENT ON TABLE parking_entries IS 'Stores parking entry and exit records for the parking management system';
COMMENT ON COLUMN parking_entries.id IS 'Unique identifier for each parking entry';
COMMENT ON COLUMN parking_entries.plate_number IS 'Vehicle license plate number';
COMMENT ON COLUMN parking_entries.entry_time IS 'Timestamp when vehicle entered the parking area';
COMMENT ON COLUMN parking_entries.exit_time IS 'Timestamp when vehicle exited the parking area (NULL if still parked)';
COMMENT ON COLUMN parking_entries.payment IS 'Payment amount in dollars (NULL if not yet paid)';
COMMENT ON COLUMN parking_entries.is_overnight IS 'Whether this entry involves overnight parking charges';
COMMENT ON COLUMN parking_entries.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN parking_entries.updated_at IS 'Timestamp when record was last updated';

-- Optional: Create a view for currently parked vehicles
CREATE OR REPLACE VIEW currently_parked_vehicles AS
SELECT 
    id,
    plate_number,
    entry_time,
    created_at,
    is_overnight
FROM parking_entries 
WHERE exit_time IS NULL
ORDER BY entry_time DESC;

-- Optional: Create a view for completed parking sessions
CREATE OR REPLACE VIEW completed_parking_sessions AS
SELECT 
    id,
    plate_number,
    entry_time,
    exit_time,
    payment,
    is_overnight,
    (exit_time - entry_time) as duration,
    created_at
FROM parking_entries 
WHERE exit_time IS NOT NULL
ORDER BY exit_time DESC;

-- Grant necessary permissions (adjust based on your Supabase setup)
-- These are typically handled automatically by Supabase, but you can add them if needed
-- GRANT ALL ON parking_entries TO authenticated;
-- GRANT ALL ON parking_entries TO anon;
-- GRANT USAGE ON SEQUENCE parking_entries_id_seq TO authenticated;
-- GRANT USAGE ON SEQUENCE parking_entries_id_seq TO anon; 