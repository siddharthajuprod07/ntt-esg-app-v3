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

### Common Issues and Solutions

1. **P3005 Error - Database schema doesn't exist**
   - This happens when migrations fail on a fresh database
   - Solution: The updated entrypoint script handles this automatically
   - If issue persists:
     ```bash
     docker-compose down -v
     docker-compose up --build
     ```

2. **"exec: no such file or directory" Error**
   - Caused by Windows CRLF line endings in shell scripts
   - Already fixed in the latest code with automatic line ending conversion
   - Manual fix if needed:
     ```powershell
     # On Windows, run:
     .\fix-line-endings.ps1
     ```

3. **Database not initialized**
   - Check the app container logs: `docker-compose logs app`
   - Ensure PostgreSQL is healthy: `docker-compose ps`
   - Force reset if needed:
     ```bash
     docker-compose down -v
     docker system prune -a
     docker-compose up --build
     ```

4. **Seeding fails**
   - The updated script handles this gracefully
   - Check if database already has data
   - View seed logs: `docker-compose logs app | grep -i seed`

5. **Connection issues**
   - Verify DATABASE_URL in docker-compose.yml
   - Check if PostgreSQL is running: `docker ps`
   - Test connection:
     ```bash
     docker exec esg-postgres pg_isready -U esg_user -d esg_survey_db
     ```

### Troubleshooting Script

Run the diagnostic script:
```bash
# On Linux/Mac:
bash scripts/docker-troubleshoot.sh

# On Windows (Git Bash):
sh scripts/docker-troubleshoot.sh
```

### Complete Reset

For a completely fresh start:
```bash
# Remove all containers and volumes
docker-compose down -v

# Remove all Docker images for this project
docker images | grep esg | awk '{print $3}' | xargs docker rmi -f

# Rebuild everything
docker-compose up --build
```

## Default Credentials

After deployment, you can log in with:
- **Admin User**: admin@esg.com / Admin@123456
- **pgAdmin**: admin@esg.com / admin123

**Important**: Change these credentials immediately in production!