# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ABAplay is a SaaS platform for pediatric intervention clinics, focused on ABA (Applied Behavior Analysis) therapy. The application manages patients, intervention programs, progress tracking, and communication between therapists and parents.

## Architecture

The project is a full-stack application with separated frontend and backend:

### Backend (`/backend`)
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL with direct SQL queries (no ORM)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time**: Socket.IO for live chat functionality
- **Entry Point**: `src/server.js`
- **Database Connection**: Uses pg Pool in `src/models/db.js`

### Frontend (`/frontend`)
- **Framework**: React 18 with React Router DOM
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios
- **Real-time**: Socket.IO client
- **Entry Point**: `src/index.js` → `src/App.js`

## Development Commands

### Backend
```bash
cd backend
npm install
npm start          # Production mode
npm run dev        # Development mode with nodemon
```

### Frontend
```bash
cd frontend
npm install
npm start          # Development server on http://localhost:3001
npm run build      # Production build
npm test           # Run tests
```

## Environment Configuration

### Backend Environment Variables (.env in backend/)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL connection
- `DATABASE_URL` - Alternative connection string (for production)
- `JWT_SECRET` - Secret key for JWT token signing
- `NODE_ENV` - Environment mode (production/development)

### Frontend Configuration
- API endpoints configured in `src/config.js`
- Default API URL: `http://localhost:3000`
- Default Socket URL: `http://localhost:3000`

## Database Structure

The application uses PostgreSQL with the following key tables:
- `disciplines` → `program_areas` → `program_sub_areas` → `programs` → `program_steps`
- `patients`, `users`, `therapist_patient_assignments`, `patient_program_assignments`
- `case_discussions`, `parent_chats` for communication features
- `patient_program_progress` for session tracking

Use `DIAGNOSTIC_QUERIES.sql` for database analysis and debugging.

## Key Application Features

### User Roles & Authentication
- **Admin**: Manages clinics, users, and patient assignments
- **Therapist**: Manages assigned patients, assigns programs, tracks progress
- **Parent**: Views child's progress and communicates with therapists

### Context Architecture (Frontend)
- `AuthContext`: User authentication and role-based access
- `PatientContext`: Patient data and selection persistence
- `ProgramContext`: Program library and assignment management

### Real-time Communication
- Socket.IO rooms for patient-specific chats
- Live notifications system
- Real-time updates in case discussions and parent-therapist chats

## Code Conventions

### Backend Patterns
- Controllers handle business logic and HTTP responses
- Models contain database query functions
- Routes define endpoints with middleware authentication
- All protected routes use `verifyToken` middleware
- Error handling with try-catch and appropriate HTTP status codes

### Frontend Patterns
- Functional components with React Hooks
- Custom hooks in `/hooks` directory (e.g., `useApi.js`)
- Context providers wrap the application for state management
- API calls centralized in `/api` directory
- Responsive design with Tailwind CSS classes

### Database Access
- Direct SQL queries using pg Pool
- No ORM - raw SQL for performance and control
- Connection pooling configured for production deployment
- SSL configuration for production database connections

## Important Files to Review

- `backend/src/server.js` - Main server configuration and routing
- `frontend/src/App.js` - React app routing and structure  
- `backend/src/models/db.js` - Database connection setup
- `backend/src/config/db.config.js` - Environment configuration
- `DIAGNOSTIC_QUERIES.sql` - Database debugging queries

## Security Considerations

- JWT tokens for stateless authentication
- Password hashing with bcrypt
- CORS configuration for cross-origin requests
- Environment variables for sensitive configuration
- SSL support for production database connections