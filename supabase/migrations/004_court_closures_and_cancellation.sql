-- Court closure dates (holidays, maintenance, etc.)
CREATE TABLE court_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(court_id, date)
);

CREATE INDEX idx_court_closures_court_date ON court_closures(court_id, date);

ALTER TABLE court_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can manage court closures"
  ON court_closures FOR ALL
  USING (
    court_id IN (
      SELECT c.id FROM courts c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    court_id IN (
      SELECT c.id FROM courts c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  );

-- Anyone can read closures (needed for public booking calendar)
CREATE POLICY "Anyone can view court closures"
  ON court_closures FOR SELECT
  USING (true);

-- Cancellation policy on tenants
ALTER TABLE tenants ADD COLUMN cancellation_hours INTEGER DEFAULT 24;
