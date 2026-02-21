-- Add 'pending' to booking status and make it the default
-- Pending bookings block time slots (prevents double-booking while awaiting approval)

-- 1. Drop existing CHECK constraint and add new one with 'pending'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

-- 2. Change default from 'confirmed' to 'pending'
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending';

-- 3. Update overlap trigger to block on BOTH 'confirmed' AND 'pending'
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE court_id = NEW.court_id
      AND date = NEW.date
      AND status IN ('confirmed', 'pending')
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
      AND id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Booking overlaps with an existing booking';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
