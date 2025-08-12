#!/bin/bash

echo "ESG App Docker Troubleshooting Script"
echo "======================================"
echo ""

# Function to check container status
check_container() {
    local container_name=$1
    if docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        local status=$(docker inspect -f '{{.State.Status}}' $container_name 2>/dev/null)
        echo "Container $container_name: $status"
        if [ "$status" != "running" ]; then
            echo "  Last logs from $container_name:"
            docker logs --tail 20 $container_name 2>&1 | sed 's/^/    /'
        fi
    else
        echo "Container $container_name: not found"
    fi
}

# Check Docker and Docker Compose
echo "1. Checking Docker installation..."
docker --version
docker-compose --version
echo ""

# Check containers
echo "2. Checking container status..."
check_container "esg-postgres"
check_container "esg-app"
check_container "esg-pgadmin"
echo ""

# Check database connection
echo "3. Testing database connection..."
docker exec esg-postgres pg_isready -U esg_user -d esg_survey_db 2>/dev/null && \
    echo "  Database is ready" || \
    echo "  Database is not ready"
echo ""

# Check for common issues
echo "4. Common issues and solutions:"
echo ""

if docker logs esg-app 2>&1 | grep -q "P3005"; then
    echo "  ⚠ P3005 Error detected - Database schema issue"
    echo "  Solution: Run these commands:"
    echo "    docker-compose down -v"
    echo "    docker-compose up --build"
    echo ""
fi

if docker logs esg-app 2>&1 | grep -q "no such file or directory"; then
    echo "  ⚠ Line ending issue detected"
    echo "  Solution: The fix has been applied in the latest code."
    echo "  Make sure you have the latest version and rebuild:"
    echo "    git pull"
    echo "    docker-compose build --no-cache app"
    echo "    docker-compose up"
    echo ""
fi

if docker logs esg-app 2>&1 | grep -q "ECONNREFUSED"; then
    echo "  ⚠ Database connection refused"
    echo "  Solution: Wait for database to be ready or check DATABASE_URL"
    echo ""
fi

# Provide reset instructions
echo "5. To completely reset and start fresh:"
echo "   docker-compose down -v"
echo "   docker system prune -a"
echo "   docker-compose up --build"
echo ""

echo "6. To view real-time logs:"
echo "   docker-compose logs -f app"
echo ""