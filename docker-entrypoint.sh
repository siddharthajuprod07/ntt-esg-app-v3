#!/bin/sh
set -e

echo "Starting application initialization..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if npx prisma db push --skip-generate 2>/dev/null; then
    echo "PostgreSQL is ready!"
    break
  fi
  echo "Waiting for PostgreSQL... ($i/30)"
  sleep 2
done

# Generate Prisma client first
echo "Generating Prisma client..."
npx prisma generate

# Check if migrations directory exists and has migrations
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Found existing migrations. Running migration deploy..."
  npx prisma migrate deploy || {
    echo "Migration deploy failed. Trying to reset and push schema..."
    npx prisma db push --force-reset
  }
else
  echo "No migrations found. Initializing database with schema push..."
  npx prisma db push
fi

# Run database seed
echo "Checking if database needs seeding..."
npx prisma db seed 2>/dev/null || echo "Database already seeded or seeding skipped"

echo "Application initialization complete!"

# Execute the main command
exec "$@"