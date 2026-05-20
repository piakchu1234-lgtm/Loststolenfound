-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Category ENUM mapping to core pillars
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pin_category') THEN
        CREATE TYPE pin_category AS ENUM (
            'lost_property',
            'missing_pet',
            'stolen_vehicle',
            'break_in',
            'suspicious_activity'
        );
    END IF;
END$$;

-- MapPin table
CREATE TABLE IF NOT EXISTS "MapPin" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    category    pin_category NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    location    GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for fast geo lookups
CREATE INDEX IF NOT EXISTS idx_mappin_location  ON "MapPin" USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_mappin_category  ON "MapPin" (category);

-- Keep the geography column in sync with lat/long on insert/update
CREATE OR REPLACE FUNCTION sync_mappin_location() RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mappin_sync_location ON "MapPin";
CREATE TRIGGER trg_mappin_sync_location
BEFORE INSERT OR UPDATE ON "MapPin"
FOR EACH ROW EXECUTE FUNCTION sync_mappin_location();
