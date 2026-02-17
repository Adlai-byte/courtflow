-- Customer notes for CRM
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- Index for fast lookups
CREATE INDEX idx_customer_notes_tenant_profile ON customer_notes(tenant_id, profile_id);

-- RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can manage their customer notes"
  ON customer_notes FOR ALL
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );
