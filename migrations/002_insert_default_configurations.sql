-- Insert default configuration values for nearby hospitals feature
-- Check if configurations already exist and insert only if they don't

-- Delete existing configurations if any (for clean re-run)
DELETE FROM admin_configurations WHERE config_key IN (
  'nearby_default_enabled',
  'nearby_default_radius_km',
  'nearby_max_radius_km',
  'nearby_fallback_enabled'
);

-- Insert default configurations
INSERT INTO admin_configurations (config_key, config_value, config_type, category, description, created_at, updated_at)
VALUES
  (
    'nearby_default_enabled',
    'true',
    'boolean',
    'nearby',
    'Enable auto-nearby mode by default for all users',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'nearby_default_radius_km',
    '20',
    'number',
    'nearby',
    'Default search radius in kilometers for nearby hospitals',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'nearby_max_radius_km',
    '50',
    'number',
    'nearby',
    'Maximum allowed search radius in kilometers',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'nearby_fallback_enabled',
    'true',
    'boolean',
    'nearby',
    'Show all hospitals when location is unavailable or denied',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Verify the inserted configurations
SELECT * FROM admin_configurations WHERE category = 'nearby' ORDER BY config_key;
