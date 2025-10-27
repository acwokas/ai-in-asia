-- Add unique constraint on location column for editors_picks table
-- This allows upsert operations to work correctly when updating editor's picks

ALTER TABLE editors_picks 
ADD CONSTRAINT editors_picks_location_unique UNIQUE (location);