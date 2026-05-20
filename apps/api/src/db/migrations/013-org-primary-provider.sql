-- Org-level "primary provider" pin.
-- When set, every member's gateway uses this provider's model as
-- agents.defaults.model.primary instead of the alphabetical first.
-- Null = no pin, fall back to alphabetical order.
ALTER TABLE organizations ADD COLUMN primary_provider TEXT;
