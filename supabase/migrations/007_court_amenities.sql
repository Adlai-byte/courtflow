-- Add amenities JSONB column to courts
-- Schema: { venue_type: string, floor_type: string, features: string[] }
ALTER TABLE courts ADD COLUMN amenities jsonb DEFAULT '{}';
