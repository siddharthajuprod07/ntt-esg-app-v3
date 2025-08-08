-- ESG Survey Database Initialization Script
-- This script will be executed when the PostgreSQL container starts for the first time

-- Create the database if it doesn't exist (handled by POSTGRES_DB env var)
-- Create user if it doesn't exist (handled by POSTGRES_USER env var)

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON DATABASE esg_survey_db TO esg_user;

-- Connect to the ESG database
\c esg_survey_db;

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Set timezone
SET timezone = 'UTC';

-- Create initial admin user (password: admin123)
-- This will be created after Prisma migrations are run