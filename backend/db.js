import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Password Reset Tokens table
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Token Blacklist table (for logout)
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Floor Plans table
      CREATE TABLE IF NOT EXISTS floor_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        image_data TEXT,
        total_area DECIMAL(10,2),
        unit VARCHAR(20) DEFAULT 'sqft',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Rooms table
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        room_type VARCHAR(100),
        width DECIMAL(10,2),
        length DECIMAL(10,2),
        height DECIMAL(10,2) DEFAULT 9,
        area DECIMAL(10,2),
        unit VARCHAR(20) DEFAULT 'ft',
        position_x INTEGER,
        position_y INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Renovation Suggestions table
      CREATE TABLE IF NOT EXISTS renovation_suggestions (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        priority VARCHAR(50),
        estimated_cost DECIMAL(12,2),
        cost_range_min DECIMAL(12,2),
        cost_range_max DECIMAL(12,2),
        difficulty VARCHAR(50),
        timeline VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        ai_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Materials table
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100),
        description TEXT,
        unit_price DECIMAL(10,2),
        unit VARCHAR(50),
        supplier VARCHAR(255),
        in_stock BOOLEAN DEFAULT true,
        image_url TEXT,
        ai_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Project Estimates table
      CREATE TABLE IF NOT EXISTS project_estimates (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        labor_cost DECIMAL(12,2),
        material_cost DECIMAL(12,2),
        total_cost DECIMAL(12,2),
        timeline_days INTEGER,
        status VARCHAR(50) DEFAULT 'draft',
        ai_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- AI Analysis Results table (history)
      CREATE TABLE IF NOT EXISTS ai_analysis (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        analysis_type VARCHAR(100),
        prompt TEXT,
        result JSONB,
        model_used VARCHAR(100),
        tokens_used INTEGER,
        processing_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Full Analysis Results table
      CREATE TABLE IF NOT EXISTS full_analyses (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        room_identification TEXT,
        layout_analysis TEXT,
        space_utilization TEXT,
        natural_light TEXT,
        renovation_potential TEXT,
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Room Dimensions Results table (AI Analysis)
      CREATE TABLE IF NOT EXISTS room_dimensions (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        room_name VARCHAR(255),
        room_type VARCHAR(100),
        width DECIMAL(10,2),
        length DECIMAL(10,2),
        area DECIMAL(10,2),
        features TEXT,
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- AI Suggestions Results table
      CREATE TABLE IF NOT EXISTS ai_suggestions (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        full_result TEXT,
        model_used VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- AI Materials Results table
      CREATE TABLE IF NOT EXISTS ai_materials (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        full_result TEXT,
        model_used VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Layout Optimizations table
      CREATE TABLE IF NOT EXISTS layout_optimizations (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        traffic_flow TEXT,
        efficiency_score DECIMAL(3,1),
        natural_light TEXT,
        privacy_analysis TEXT,
        noise_zones TEXT,
        furniture_suggestions TEXT,
        layout_modifications TEXT,
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Design Templates table
      CREATE TABLE IF NOT EXISTS design_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        style VARCHAR(100),
        description TEXT,
        room_type VARCHAR(100),
        features JSONB,
        color_palette JSONB,
        image_url TEXT,
        popularity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Contractors table
      CREATE TABLE IF NOT EXISTS contractors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        specialty VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        rating DECIMAL(3,2),
        hourly_rate DECIMAL(10,2),
        availability VARCHAR(100),
        location VARCHAR(255),
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Room Detections table (AI Room Detector)
      CREATE TABLE IF NOT EXISTS room_detections (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        detected_rooms JSONB,
        total_rooms INTEGER,
        confidence_score DECIMAL(5,2),
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Home Staging table (AI Home Staging Advisor)
      CREATE TABLE IF NOT EXISTS home_staging (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        staging_style VARCHAR(100),
        recommendations JSONB,
        target_buyer VARCHAR(100),
        estimated_value_increase DECIMAL(12,2),
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Furniture Placements table (AI Furniture Placer)
      CREATE TABLE IF NOT EXISTS furniture_placements (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        furniture_items JSONB,
        layout_score DECIMAL(5,2),
        traffic_flow_rating VARCHAR(50),
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Maintenance Predictions table (AI Home Maintenance Predictor)
      CREATE TABLE IF NOT EXISTS maintenance_predictions (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        predictions JSONB,
        total_annual_cost DECIMAL(12,2),
        priority_items INTEGER,
        next_maintenance_date DATE,
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Energy Audits table (AI Energy Efficiency Auditor)
      CREATE TABLE IF NOT EXISTS energy_audits (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        efficiency_score DECIMAL(5,2),
        annual_cost_estimate DECIMAL(12,2),
        potential_savings DECIMAL(12,2),
        recommendations JSONB,
        carbon_footprint DECIMAL(10,2),
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Home Inspections table (AI Home Inspection Reporter)
      CREATE TABLE IF NOT EXISTS home_inspections (
        id SERIAL PRIMARY KEY,
        floor_plan_id INTEGER REFERENCES floor_plans(id) ON DELETE CASCADE,
        inspection_type VARCHAR(100),
        overall_condition VARCHAR(50),
        issues_found JSONB,
        critical_issues INTEGER,
        estimated_repair_cost DECIMAL(12,2),
        full_result TEXT,
        model_used VARCHAR(100),
        ai_generated BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_floor_plans_user ON floor_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_floor_plan ON rooms(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_suggestions_floor_plan ON renovation_suggestions(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_ai_analysis_floor_plan ON ai_analysis(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_room_detections_floor_plan ON room_detections(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_home_staging_floor_plan ON home_staging(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_furniture_placements_floor_plan ON furniture_placements(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_floor_plan ON maintenance_predictions(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_energy_audits_floor_plan ON energy_audits(floor_plan_id);
      CREATE INDEX IF NOT EXISTS idx_home_inspections_floor_plan ON home_inspections(floor_plan_id);
    `);

    // Add ai_generated column to existing tables if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='ai_generated') THEN
          ALTER TABLE materials ADD COLUMN ai_generated BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_estimates' AND column_name='ai_generated') THEN
          ALTER TABLE project_estimates ADD COLUMN ai_generated BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='name') THEN
          ALTER TABLE materials ADD CONSTRAINT materials_name_unique UNIQUE (name);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verification_token') THEN
          ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
        END IF;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$;
    `);
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
