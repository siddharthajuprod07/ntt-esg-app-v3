@echo off
echo 🚀 Setting up ESG Survey Database...

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
:wait_for_postgres
docker-compose exec postgres pg_isready -U esg_user -d esg_survey_db >nul 2>&1
if %errorlevel% neq 0 (
    echo Waiting for PostgreSQL...
    timeout /t 2 /nobreak >nul
    goto wait_for_postgres
)

echo ✅ PostgreSQL is ready!

REM Run Prisma migrations
echo 📊 Running Prisma database migrations...
docker-compose exec app npx prisma db push

REM Generate Prisma client
echo 🔄 Generating Prisma client...
docker-compose exec app npx prisma generate

REM Seed the database with initial data
echo 🌱 Seeding database with initial data...
docker-compose exec app npx prisma db seed 2>nul || echo No seed script found, skipping...

echo 🎉 Database setup complete!
echo 📊 pgAdmin is available at: http://localhost:8081
echo    Email: admin@esg.com
echo    Password: admin123
echo 🌐 Application is available at: http://localhost:3001
pause