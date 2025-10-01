# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Setup and Environment
```bash
# Install dependencies
npm install

# Database setup - Push schema to PostgreSQL
npm run db:push

# Database migrations (production)
npm run db:migrate

# Generate Drizzle schema
npm run db:generate
```

### Development Server
```bash
# Start development server (React + Express with hot reload)
npm run dev

# Check TypeScript without building
npm run check

# Build for production
npm run build

# Start production server
npm start
```

### Database and User Management Scripts
```bash
# Create super admin user
npm run create-super-admin

# Create clinic admin user
npm run create-clinic-admin

# Create test doctor
npm run create-test-doctor

# Create test patient
npm run create-test-patient

# Create attender and assign to doctor
npm run create-attender
npm run assign-doctor-to-attender

# Reset user password
npm run reset-password

# Seed test data
npm run seed-data
```

### Testing Individual Components
```bash
# Test single file with tsx
tsx server/index.ts
tsx scripts/reset-password.ts
tsx migrations/run.ts
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with Passport.js
- **UI**: Tailwind CSS + ShadCN UI components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter (client-side)

### Project Structure
```
ClinicFlow/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components (role-based dashboards)
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/          # Utilities and API client
├── server/                # Express backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database access layer
│   ├── auth.ts           # Authentication logic
│   └── services/         # Backend services (notifications, ETA, SMS)
├── shared/               # Shared code
│   └── schema.ts         # Database schema and TypeScript types
├── migrations/           # Database migration files
└── scripts/              # Utility scripts
```

### Key Database Tables and Relationships

The system is built around several core entities:
- **users**: All user types (patients, doctors, attenders, admins)
- **clinics**: Clinic locations and information
- **appointments**: Queue-based appointment system with token numbers
- **doctor_schedules**: Working hours and availability
- **doctor_daily_presence**: Real-time arrival tracking
- **notifications**: System-generated user notifications

### User Roles and Permissions
1. **Patients**: Book appointments, view history, track queue status
2. **Doctors**: View schedules and appointments 
3. **Attenders/Clinic Staff**: Manage doctor presence, appointment status, walk-ins
4. **Clinic Admins**: Oversee clinic operations and staff
5. **Super Admins**: System-wide administration

### Critical Application Flows

#### Token-Based Queue System
- Each appointment gets a sequential token number per doctor/schedule
- Real-time ETA calculations based on doctor presence and queue position
- Status tracking: `token_started` → `in_progress` → `completed`
- Walk-in patients can be added by attenders with guest information

#### Appointment Status Management
- Attenders control appointment flow through status updates
- Doctor arrival triggers notification cascade to waiting patients
- Pause/resume functionality for schedules and individual appointments
- Status changes generate automatic notifications

#### Multi-Portal Authentication
- Separate login flows for patients, staff, and admins
- Role-based route protection with `ProtectedRoute` component
- Session persistence with PostgreSQL storage
- Password reset functionality for all user types

## Environment Configuration

### Required Environment Variables
```env
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your_session_secret_key
```

### Optional Configuration
```env
PORT=5001                    # Server port (defaults to 5001)
NODE_ENV=development         # Environment mode
ANTHROPIC_API_KEY=           # For AI features (if implemented)
PERPLEXITY_API_KEY=          # For research features (if implemented)
```

## Development Guidelines

### Database Schema Changes
1. Modify `shared/schema.ts` with new tables/columns
2. Run `npm run db:generate` to create migration
3. Apply with `npm run db:push` (dev) or `npm run db:migrate` (prod)
4. Update TypeScript types are automatically generated

### Adding New API Endpoints
1. Define route in `server/routes.ts`
2. Add database operations in `server/storage.ts`
3. Use Zod schemas for request validation
4. Follow RESTful conventions and existing patterns

### Frontend Component Development
- Use ShadCN UI components from `@/components/ui/`
- Implement data fetching with React Query hooks
- Follow role-based page organization in `client/src/pages/`
- Use Wouter for client-side routing

### Authentication and Authorization
- All protected routes use `ProtectedRoute` wrapper with `allowedRoles`
- Session management handled automatically by Passport.js
- Check user role in components: `const { user } = useAuth()`
- Route protection examples in `client/src/App.tsx`

### Notification System
- Notifications auto-generated for status changes and doctor arrivals
- Polling-based updates (no WebSocket currently)
- Service located in `server/services/notification.ts`
- Frontend polling in notification components

## Task Management Integration

This project uses Task Master AI for development workflow management. Key commands:

### Task Master Commands
```bash
# View current tasks and progress
task-master list

# Get next task to work on
task-master next

# View specific task details
task-master show <id>

# Mark task complete
task-master set-status --id=<id> --status=done

# Break down complex tasks
task-master expand --id=<id>
```

### Development Workflow
1. Start coding sessions with `task-master list`
2. Select tasks based on dependencies and priority
3. Use `task-master show <id>` for implementation details
4. Mark tasks complete after verification
5. Update dependent tasks if implementation differs from plan

## Testing and Verification

### Manual Testing Approach
1. **Authentication**: Test all user role logins
2. **Appointment Booking**: End-to-end patient booking flow
3. **Queue Management**: Attender dashboard functionality
4. **Status Updates**: Real-time notification delivery
5. **Role Permissions**: Verify route protection works

### Common Test Scenarios
- Doctor arrival/departure handling
- Walk-in appointment creation
- Token progression and ETA calculation
- Cross-role notification delivery
- Schedule pause/resume functionality

## Known Implementation Details

### Port Management
- Server auto-detects available port starting from 5001
- Handles port conflicts gracefully with fallback mechanism

### Database Connection
- Uses connection pooling with `pg` library
- Session storage in PostgreSQL via `connect-pg-simple`

### File Upload and Storage
- No current file upload implementation
- User images stored as URLs in `users.imageUrl`

### Real-time Features
- Polling-based notifications (no WebSocket)
- ETA calculations server-side in storage layer
- Status updates trigger notification cascades

## Special Considerations

### Windows Development
- Uses `tsx` for TypeScript execution instead of `ts-node`
- File paths use Windows separators in configuration
- PowerShell-compatible script commands

### Production Deployment
- Build process creates `dist/` directory
- Static files served from `dist/public/`
- Database migrations run separately from build

### Security
- Session-based authentication with secure cookies
- Password hashing with bcrypt-compatible library
- Role-based access control throughout application
- Input validation with Zod schemas

### Performance
- Database queries optimized with proper indexing
- React Query caching for API responses
- Lazy loading of page components where appropriate