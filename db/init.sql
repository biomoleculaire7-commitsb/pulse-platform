-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Useful spatial index (created by SQLAlchemy on first run,
-- but adding here as backup)
-- CREATE INDEX IF NOT EXISTS ix_infection_location
--   ON infection_records USING GIST (location);
