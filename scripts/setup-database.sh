#!/bin/bash

# ESG Survey Database Setup Script
echo "🚀 Setting up ESG Survey Database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U esg_user -d esg_survey_db; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run Prisma migrations
echo "📊 Running Prisma database migrations..."
docker-compose exec app npx prisma db push

# Generate Prisma client
echo "🔄 Generating Prisma client..."
docker-compose exec app npx prisma generate

# Seed the database with initial data
echo "🌱 Seeding database with initial data..."
docker-compose exec app npx prisma db seed 2>/dev/null || echo "No seed script found, skipping..."

echo "🎉 Database setup complete!"
echo "📊 pgAdmin is available at: http://localhost:8081"
echo "   Email: admin@esg.com"
echo "   Password: admin123"
echo "🌐 Application is available at: http://localhost:3001"