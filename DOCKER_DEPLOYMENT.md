# Docker Deployment Guide

This application is configured to automatically set up the database schema and seed data during deployment.

## Database Initialization

The Docker setup automatically:
1. Creates all database tables from the Prisma schema
2. Seeds the database with initial data including:
   - Default admin user (email: `admin@esg.com`, password: `Admin@123456`)
   - ESG Pillars (Environmental, Social, Governance)
   - Sample Levers for each pillar

## Development Deployment

To run the application in development mode:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The development environment will:
- Automatically run database migrations
- Seed the database with initial data
- Start the Next.js development server with hot-reload

Access points:
- Application: http://localhost:3001
- pgAdmin: http://localhost:8081 (admin@esg.com / admin123)

## Production Deployment

For production deployment:

```bash
# Create a .env file with production values
cat > .env.production << EOF
DB_PASSWORD=your-secure-password
NEXTAUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=https://your-domain.com
EOF

# Build and run with production config
docker-compose -f docker-compose.prod.yml --env-file .env.production up --build
```

Access point:
- Application: http://localhost:3000

## Rebuild Database

If you need to reset and rebuild the database:

```bash
# Stop containers and remove volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

## View Logs

To check initialization logs:

```bash
# View all logs
docker-compose logs

# View app logs only
docker-compose logs app

# Follow logs in real-time
docker-compose logs -f app
```

## Troubleshooting

1. **Database not initialized**: Check the app container logs for migration errors
2. **Seeding fails**: Ensure the database is healthy before the app starts
3. **Connection issues**: Verify DATABASE_URL in docker-compose.yml matches your postgres service

## Default Credentials

After deployment, you can log in with:
- **Admin User**: admin@esg.com / Admin@123456
- **pgAdmin**: admin@esg.com / admin123

**Important**: Change these credentials immediately in production!