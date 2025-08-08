# ESG Survey Platform

A comprehensive ESG (Environmental, Social, and Governance) assessment platform built with Next.js 15, TypeScript, and PostgreSQL.

## Features

- 🌱 **ESG Assessment**: Comprehensive surveys for Environmental, Social, and Governance metrics
- 🔐 **Authentication**: Secure local authentication with NextAuth.js
- 📊 **Analytics Dashboard**: Real-time ESG performance tracking and visualization
- 👥 **Role-based Access**: Multi-tier user management (Admin, Creator, Respondent, Viewer)
- 🎨 **Professional UI**: Modern interface built with shadcn/ui and Tailwind CSS
- 🐳 **Containerized**: Full Docker setup with PostgreSQL and pgAdmin

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16
- **UI**: shadcn/ui, Tailwind CSS, Lucide Icons
- **Authentication**: NextAuth.js
- **Containerization**: Docker & Docker Compose

## Getting Started

### Option 1: Docker Setup (Recommended)

1. **Clone and Setup**:
   ```bash
   git clone <repository-url>
   cd ntt-esg-app-v3
   ```

2. **Start Services**:
   ```bash
   docker-compose up -d
   ```

3. **Setup Database** (Windows):
   ```bash
   scripts/setup-database.bat
   ```

   **Setup Database** (Linux/Mac):
   ```bash
   chmod +x scripts/setup-database.sh
   ./scripts/setup-database.sh
   ```

4. **Access Applications**:
   - 🌐 **ESG Survey App**: http://localhost:3001
   - 📊 **pgAdmin**: http://localhost:8081
     - Email: `admin@esg.com`
     - Password: `admin123`

### Option 2: Local Development

1. **Prerequisites**:
   - Node.js 18+
   - PostgreSQL 12+
   - npm or yarn

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

4. **Database Setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Database Access

### pgAdmin (Docker Setup)
- URL: http://localhost:8081
- Email: `admin@esg.com`
- Password: `admin123`
- Server already configured as "ESG Survey Database"

### Direct Database Connection
- Host: `localhost`
- Port: `5433` (mapped from container's 5432)
- Database: `esg_survey_db`
- Username: `esg_user`
- Password: `esg_password123`

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `SUPER_ADMIN` | System administrator | Full system access |
| `ORG_ADMIN` | Organization administrator | Manage org surveys and users |
| `SURVEY_CREATOR` | Survey designer | Create and manage surveys |
| `RESPONDENT` | Survey participant | Complete assigned surveys |
| `VIEWER` | Read-only access | View dashboards and reports |

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Surveys (Protected)
- `GET /api/surveys` - List user surveys
- `POST /api/surveys` - Create new survey
- `GET /api/surveys/[id]` - Get survey details
- `PUT /api/surveys/[id]` - Update survey
- `DELETE /api/surveys/[id]` - Delete survey

### Responses (Protected)
- `POST /api/responses` - Submit survey response
- `GET /api/responses/[surveyId]` - Get survey responses

## Database Schema

### Core Models
- **User**: Authentication and profile information
- **Survey**: ESG survey definitions
- **Question**: Individual survey questions
- **Response**: User survey submissions
- **Answer**: Individual question responses

### ESG Categories
- **Environmental**: Carbon footprint, resource efficiency, waste management
- **Social**: Employee wellbeing, diversity, community impact
- **Governance**: Board structure, ethics, risk management

## Development Commands

```bash
# Start development server
npm run dev

# Build application
npm run build

# Run production server
npm start

# Database operations
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to database
npx prisma studio        # Open Prisma Studio
npx prisma migrate dev   # Create and apply migration

# Docker operations
docker-compose up -d            # Start all services
docker-compose down             # Stop all services
docker-compose logs app         # View app logs
docker-compose exec postgres psql -U esg_user -d esg_survey_db  # Access database CLI
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── ui/                # shadcn/ui components
│   └── navbar.tsx         # Navigation component
├── lib/                   # Utility libraries
│   ├── auth.ts            # NextAuth configuration
│   ├── prisma.ts          # Prisma client
│   └── utils.ts           # Utility functions
├── prisma/                # Database schema and migrations
├── docker/                # Docker configuration files
├── scripts/               # Setup scripts
└── design/                # Design documentation
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://esg_user:esg_password123@postgres:5432/esg_survey_db?schema=public"

# Authentication
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key"

# App
NODE_ENV="development"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and add tests
4. Submit a pull request

## License

This project is licensed under the MIT License.