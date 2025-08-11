#!/bin/sh
set -e

echo "Starting application initialization..."

# Wait for the database to be ready
echo "Waiting for database to be ready..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "Database is not ready yet. Waiting..."
  sleep 2
done

echo "Database is ready!"

# Run Prisma migrations (preferred method for production)
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database seed
echo "Seeding database with initial data..."
npx prisma db seed || echo "Seeding skipped or already completed"

echo "Application initialization complete!"

# Execute the main command
exec "$@"