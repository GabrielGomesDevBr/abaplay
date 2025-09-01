# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ABAplay is a comprehensive SaaS platform for pediatric intervention clinics, focused on ABA (Applied Behavior Analysis) therapy. The application manages patients, intervention programs, progress tracking, and communication between therapists and parents with advanced features for session management and progress analysis.

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
- **Package Manager**: npm with CommonJS modules
- **Version**: 1.0.0

### Frontend (`/frontend`)
- **Framework**: React 18 with React Router DOM v6
- **Styling**: Tailwind CSS v3.4.7
- **Icons**: FontAwesome v6.5.2 and Lucide React v0.417.0
- **Charts**: Chart.js v4.4.3 with react-chartjs-2 v5.2.0 and chartjs-plugin-annotation v3.0.1
- **PDF Generation**: jsPDF v2.5.1 with jspdf-autotable v3.8.2
- **HTTP Client**: Axios v1.11.0
- **Real-time**: Socket.IO client v4.8.1
- **Authentication**: JWT decode v4.0.0 for token management
- **Entry Point**: `src/index.js` → `src/App.js`
- **Development Server**: Runs on port 3001 with HOST=0.0.0.0

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

Key architectural features:
- Programs store materials and procedures as JSONB fields
- SSL support for production database connections
- Enhanced security with access control checks
- Notification system with status tracking
- Status normalization utility (`/backend/src/utils/statusNormalizer.js`) for consistent program status handling
- Support for program status: active, archived, paused

Use `DIAGNOSTIC_QUERIES.sql` for database analysis and debugging.
Additional SQL file `NORMALIZE_STATUS.sql` for status standardization.

## Key Application Features

### User Roles & Authentication
- **Admin**: Manages clinics, users, patient assignments, and program library
- **Therapist**: Manages assigned patients, assigns programs, tracks progress with detailed session management
- **Parent**: Views child's progress, communicates with therapists, and accesses detailed reports

### Core Features
- **Program Management**: Hierarchical program structure with disciplines, areas, and sub-areas
- **Advanced Session Tracking**: Progress tracking with prompt levels, session data, and interactive charts
- **Prompt Level System**: ABA-compliant prompt levels (Independent, Verbal Cue, Gestural Cue, Partial Physical Help, Total Physical Help, No Response) with visual indicators and progress scoring
- **Communication**: Case discussions and parent-therapist chats with Socket.IO real-time messaging
- **Notifications**: Real-time notification system with status management and badge indicators
- **PDF Reports**: Consolidated patient reports with jsPDF generation including progress charts and session details
- **Evolution Report System**: Complete therapeutic evolution reporting system with:
  - Multi-disciplinary professional support (psychology, speech therapy, occupational therapy, etc.)
  - One-time professional data configuration (registration, qualifications, signature)
  - Persistent patient data reuse
  - Flexible period selector (30/60/90 days or custom)
  - Automatic analysis with real-data insights
  - Editable preview before PDF generation
  - Professional PDF formatting with consistent layout
- **Program Assignment**: Therapist-patient program assignments with normalized status management (active/archived/paused)
- **User Management**: Admin interface for managing clinics, users, and patient assignments with role-based access
- **Progress Visualization**: Interactive charts grouped by intervention areas with Chart.js annotations
- **Status Management**: Normalized program status handling across the system with database constraints
- **Contact Management**: Integrated contact system for therapists and colleagues
- **Progress Alerts**: Automated alert system for session progress and milestones

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
  - `adminController.js` - Admin operations and user management
  - `assignmentController.js` - Patient-therapist assignments with prompt level support
  - `authController.js` - Authentication logic and JWT management
  - `caseDiscussionController.js` - Case discussion management
  - `contactController.js` - Contact and colleague management
  - `notificationController.js` - Notification system with status tracking
  - `parentChatController.js` - Parent-therapist chat functionality
  - `parentController.js` - Parent-specific operations and dashboards
  - `patientController.js` - Patient management and data access
  - `programController.js` - Program operations and library management
  - `reportController.js` - **NEW**: Evolution report system with automatic analysis
  - `contactController.js` - **NEW**: Contact and colleague management
- `src/models/` - Database query functions with enhanced error handling
  - `assignmentModel.js` - Assignment operations with status constraints
  - `caseDiscussionModel.js` - Case discussion data management
  - `clinicModel.js` - Clinic information management
  - `notificationStatusModel.js` - Notification status tracking
  - `parentChatModel.js` - Parent-therapist chat data
  - `patientModel.js` - Patient data operations with complementary fields
  - `programModel.js` - Program library and hierarchy management
  - `reportModel.js` - **NEW**: Evolution report with automatic analysis and insights
  - `contactModel.js` - **NEW**: Contact management system
  - `userModel.js` - User authentication and profile management with professional data
- `src/routes/` - API endpoint definitions with middleware integration
- `src/middleware/authMiddleware.js` - JWT authentication and role verification
- `src/utils/` - Utility functions and helpers
  - `statusNormalizer.js` - Status normalization for program consistency
  - `promptLevels.js` - ABA prompt level definitions and calculations
  - `progressAlerts.js` - Progress monitoring and alert generation

### Frontend Structure
- `src/App.js` - React app routing with role-based access and authentication guards
- `src/context/` - React contexts for state management
  - `AuthContext.js` - Authentication state and user session management
  - `PatientContext.js` - Patient data, selection persistence, and program management
  - `ProgramContext.js` - Program library management and hierarchical data
- `src/components/` - Reusable UI components organized by feature
  - `admin/` - Admin-specific components (AssignmentModal, UserFormModal)
  - `chat/` - Communication components (CaseDiscussionChat, ParentTherapistChat)
  - `contacts/` - Contact management components (ContactList)
  - `layout/` - Layout components (MainLayout, Navbar, Sidebar)
  - `notifications/` - Notification system (NotificationBadge, NotificationPanel, PatientNotificationBadge, ProgressAlert)
  - `patient/` - Patient components (PatientDetails, PatientForm, PatientList, ConsolidatedReportModal)
  - `program/` - Program components (AssignedProgramsList, ProgramCard, ProgramLibrary, SessionChart, SessionProgress, PromptLevelSelector)
  - `reports/` - **NEW**: Evolution report components (ReportEvolutionModal, ReportPreview, ReportEvolutionContainer)
  - `shared/` - Shared components (Button, Modal, DateRangeSelector)
- `src/pages/` - Main page components with enhanced functionality
  - `AdminPage.js` - Admin dashboard with user and clinic management
  - `AdminProgramsPage.js` - Admin program library management
  - `ClientsPage.js` - Patient management for therapists
  - `ColleaguesPage.js` - Professional network and contacts
  - `ContactsPage.js` - Contact management interface
  - `DashboardPage.js` - Therapist dashboard with patient overview
  - `HomePage.js` - Landing page with role-based redirection
  - `LoginPage.js` - Enhanced authentication with modern UI
  - `NotesPage.js` - Patient notes and documentation
  - `ParentDashboardPage.js` - Parent dashboard with progress visualization
  - `ProgramSessionPage.js` - Advanced session tracking with prompt levels
  - `ProgramsPage.js` - Program library and assignment interface
- `src/api/` - Centralized API communication with error handling
  - `adminApi.js`, `authApi.js`, `caseDiscussionApi.js`, `contactApi.js`
  - `notificationApi.js`, `parentApi.js`, `parentChatApi.js`
  - `patientApi.js`, `programApi.js` - Enhanced with prompt level support
  - `reportApi.js` - **NEW**: Evolution report API with period options and automatic analysis
- `src/hooks/` - Custom React hooks
  - `useApi.js` - Custom API hook with loading states
  - `usePatientNotifications.js` - Patient-specific notification management
- `src/utils/pdfGenerator.js` - Advanced PDF report generation with charts and evolution reports
- `src/config.js` - Frontend configuration and API endpoints

### Database & Analysis
- `DIAGNOSTIC_QUERIES.sql` - Database debugging and analysis queries
- `NORMALIZE_STATUS.sql` - Status standardization queries

## Recent Improvements & Technical Features

### Prompt Level System Integration
- **ABA-compliant prompt levels**: 6-level system from Independent (5) to No Response (0)
- **Visual indicators**: Color-coded prompt levels with descriptive names
- **Progress scoring**: Automated calculation based on prompt level and success rate
- **Component**: `PromptLevelSelector.js` provides intuitive UI for session recording
- **Backend utility**: `promptLevels.js` manages level definitions and progress calculations

### Database Constraints & Status Management
- **Status normalization**: Database constraints enforce consistent status values (active/archived/paused)
- **Assignment creation fix**: Default status assignment prevents constraint violations
- **Error handling**: Proper error messages for duplicate assignments and invalid statuses

### Enhanced User Experience
- **Modernized Login UI**: Updated LoginPage with improved animations and visual design
- **Progress visualization**: Advanced Chart.js integration with annotations and area grouping
- **PDF generation**: Comprehensive reports including session data and progress charts
- **Real-time notifications**: Socket.IO integration for instant updates and communication

### Technical Architecture Improvements
- **Context-based state management**: Enhanced PatientContext with selection persistence
- **API error handling**: Comprehensive error handling across all API endpoints
- **Component organization**: Improved component structure with feature-based organization
- **Hook abstractions**: Custom hooks for API calls and notification management

## Security Considerations

- JWT tokens for stateless authentication with proper expiration handling
- Password hashing with bcrypt for secure storage
- CORS configuration for cross-origin requests
- Environment variables for sensitive configuration
- SSL support for production database connections
- Input validation with express-validator across all endpoints
- Database constraints for data integrity and consistency
- Role-based access control with middleware verification