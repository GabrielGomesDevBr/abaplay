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
- **Security**: Helmet for security headers, CORS configuration
- **Validation**: express-validator for input validation
- **Real-time**: Socket.IO for live chat functionality
- **Entry Point**: `src/server.js`
- **Database Connection**: Uses pg Pool in `src/models/db.js` with SSL support

### Frontend (`/frontend`)
- **Framework**: React 18 with React Router DOM
- **Styling**: Tailwind CSS
- **Icons**: FontAwesome with react-fontawesome
- **Charts**: Chart.js with react-chartjs-2 and chartjs-plugin-annotation
- **PDF Generation**: jsPDF with jspdf-autotable
- **HTTP Client**: Axios
- **Real-time**: Socket.IO client
- **Authentication**: JWT decode for token management
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
- `disciplines` → `program_areas` → `program_sub_areas` → `programs` (hierarchical program structure)
- `patients`, `users`, `clinics` for core entities
- `therapist_patient_assignments`, `patient_program_assignments` for relationships
- `case_discussions`, `parent_chats`, `notifications` for communication features
- `patient_program_progress` for session tracking and progress data
- `notification_status` for notification management

Key architectural changes:
- Programs store materials and procedures as JSONB fields
- SSL support for production database connections
- Enhanced security with access control checks
- Notification system with status tracking

Use `DIAGNOSTIC_QUERIES.sql` for database analysis and debugging.

## Key Application Features

### User Roles & Authentication
- **Admin**: Manages clinics, users, and patient assignments
- **Therapist**: Manages assigned patients, assigns programs, tracks progress
- **Parent**: Views child's progress and communicates with therapists

### Core Features
- **Program Management**: Hierarchical program structure with disciplines, areas, and sub-areas
- **Session Tracking**: Progress tracking with session data and charts
- **Communication**: Case discussions and parent-therapist chats
- **Notifications**: Real-time notification system with status management
- **PDF Reports**: Consolidated patient reports with jsPDF generation
- **Program Assignment**: Therapist-patient program assignments with status management

### Context Architecture (Frontend)
- `AuthContext`: User authentication and role-based access
- `PatientContext`: Patient data, selection persistence, and program management
- `ProgramContext`: Program library and assignment management

### Real-time Communication
- Socket.IO rooms for patient-specific chats
- Live notifications system with notification badge
- Real-time updates in case discussions and parent-therapist chats

## Code Conventions

### Backend Patterns
- Controllers handle business logic and HTTP responses with validation
- Models contain database query functions with detailed logging
- Routes define endpoints with middleware authentication (`verifyToken`)
- Access control functions (`checkAccess`) for security
- Error handling with try-catch and appropriate HTTP status codes
- Input validation with express-validator

### Frontend Patterns
- Functional components with React Hooks
- Custom hooks in `/hooks` directory (e.g., `useApi.js`)
- Context providers wrap the application for state management
- API calls centralized in `/api` directory with proper error handling
- Responsive design with Tailwind CSS classes
- FontAwesome icons for UI elements
- Loading states and progress indicators

### Database Access
- Direct SQL queries using pg Pool
- No ORM - raw SQL for performance and control
- Connection pooling configured for production deployment
- SSL configuration for production database connections

## Important Files to Review

### Backend Structure
- `src/server.js` - Main server configuration and Socket.IO setup
- `src/models/db.js` - Database connection with SSL support
- `src/config/db.config.js` - Environment configuration
- `src/controllers/` - Business logic controllers with validation
- `src/models/` - Database query functions
- `src/routes/` - API endpoint definitions
- `src/middleware/authMiddleware.js` - Authentication middleware

### Frontend Structure
- `src/App.js` - React app routing with role-based access
- `src/context/` - React contexts for state management
- `src/components/` - Reusable UI components organized by feature
- `src/pages/` - Main page components
- `src/api/` - Centralized API communication
- `src/config.js` - Frontend configuration

### Database & Analysis
- `DIAGNOSTIC_QUERIES.sql` - Database debugging and analysis queries

## Security Considerations

- JWT tokens for stateless authentication
- Password hashing with bcrypt
- CORS configuration for cross-origin requests
- Environment variables for sensitive configuration
- SSL support for production database connections