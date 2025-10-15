-- Create admin_configurations table
CREATE TABLE IF NOT EXISTS admin_configurations (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) NOT NULL DEFAULT 'string',
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  is_editable BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_config_category ON admin_configurations(category);
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_configurations(config_key);

-- Insert default nearby hospital configurations
INSERT INTO admin_configurations (config_key, config_value, config_type, description, category, is_editable) VALUES
('nearby_default_enabled', 'true', 'boolean', 'Enable nearby hospitals by default for all users', 'nearby', true),
('nearby_default_radius_km', '20', 'number', 'Default search radius for nearby hospitals in kilometers', 'nearby', true),
('nearby_max_radius_km', '50', 'number', 'Maximum allowed radius for nearby hospital search', 'nearby', true),
('nearby_fallback_enabled', 'true', 'boolean', 'Show all hospitals if location is unavailable', 'nearby', true)
ON CONFLICT (config_key) DO NOTHING;
