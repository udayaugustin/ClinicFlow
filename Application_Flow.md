# ClinicFlow Application Architecture

## Overview

ClinicFlow is a comprehensive healthcare appointment management system designed to streamline the patient booking process and optimize clinic operations. The application connects patients, doctors, and clinic staff through a unified platform that manages appointments, tracks doctor availability, and provides real-time notifications.

## Key User Roles

1. **Patients**
   - Book appointments with doctors
   - View appointment status and token progress
   - Receive notifications about appointment changes

2. **Doctors**
   - View scheduled appointments
   - Manage patient consultations
   - Track appointment statuses

3. **Attenders (Clinic Staff)**
   - Mark doctors as arrived/not arrived
   - Update appointment statuses
   - Create walk-in appointments
   - Manage the patient queue

4. **Hospital Administrators**
   - Manage doctor schedules and availability
   - Configure clinic settings
   - Oversee overall operation

## Core System Components

### 1. Authentication System

- Located in `server/auth.ts`
- Handles user login, registration, and session management
- Uses session-based authentication with cookies
- Supports multiple user roles with different permissions

### 2. Database Schema

- Defined in `shared/schema.ts`
- Uses a PostgreSQL database with Drizzle ORM
- Key tables:
  - `users`: Stores user data (patients, doctors, attenders, admins)
  - `clinics`: Clinic information
  - `doctor_schedules`: Doctor working hours and availability
  - `doctor_daily_presence`: Tracks whether doctors have arrived at the clinic
  - `appointments`: Appointment details including status and token numbers
  - `notifications`: System notifications for users

### 3. Storage Layer

- Located in `server/storage.ts`
- Implements the `IStorage` interface with a `DatabaseStorage` class
- Handles all database operations through structured methods
- Provides transaction support and error handling

### 4. API Routes

- Located in `server/routes.ts`
- RESTful API endpoints for all client-server communication
- Organized by feature area (appointments, doctors, notifications, etc.)
- Implements authorization checks and input validation

### 5. Token System

- Manages patient queue using numerical tokens
- Each appointment has a unique token number for its doctor/clinic/date
- The system tracks current token progress to estimate waiting times
- Special handling for walk-in appointments vs. pre-booked appointments

### 6. Notification System

- Located in `server/services/notification.ts` (backend) and `client/src/components/notifications/notification-popover.tsx` (frontend)
- Provides real-time alerts for appointment status changes, doctor arrival, etc.
- Implements adaptive polling based on user activity and appointment status
- Supports both in-app notifications and browser notifications

## Application Data Flow

### 1. Appointment Booking Flow

1. Patient searches for a doctor (by specialty, location, etc.)
2. System displays available doctors and their schedules
3. Patient selects a time slot for appointment
4. System validates the slot availability and creates an appointment
5. Patient receives a confirmation with appointment details and token number

### 2. Appointment Management Flow

1. Attender marks doctor as arrived at the clinic
2. System notifies patients with appointments about doctor arrival
3. Attender calls patients based on token number
4. Attender updates appointment status (start, hold, pause, completed, cancel)
5. System updates token progress and notifies relevant patients

### 3. Token Progress Calculation

1. System tracks the current token being processed for each doctor
2. For patients waiting, system calculates:
   - Base token difference (patient token - current token)
   - Additional factor for walk-in patients that might be ahead
   - Status-based adjustments (canceled appointments are skipped)
3. Frontend displays estimated waiting time and tokens ahead

### 4. Notification Delivery Flow

1. Server generates notification when a relevant event occurs
2. Client polls for new notifications using adaptive intervals
3. Notifications are displayed in the UI notification bell
4. Critical notifications trigger sound and browser notifications
5. Users can mark notifications as read

## Key Technical Concepts

### 1. Token Management

- Token numbers are assigned sequentially for each doctor-clinic-date combination
- Token progress is tracked separately for each doctor's schedule
- The system handles:
  - Token calculation based on appointment status
  - Adjustments for walk-in patients
  - Special conditions like canceled or paused appointments

### 2. Doctor Schedules and Availability

- Doctors have weekly schedules with fixed time slots
- Each schedule has a maximum token limit
- The daily presence system tracks when doctors have arrived
- Appointments are only scheduled during valid time slots

### 3. Adaptive Notification System

- Polling frequency adjusts based on:
  - Whether the user has active appointments (15s vs 30s)
  - Whether the browser tab is active (30s vs 60s)
- System implements exponential backoff for failed requests
- Browser notifications appear when the tab is not active

## Frontend Architecture

- React-based SPA with client-side routing
- TanStack Query for data fetching and state management
- Shadcn UI components for consistent design
- Key pages:
  - `/`: Home page with doctor search
  - `/appointments`: Patient appointment history
  - `/booking/:doctorId`: Appointment booking flow
  - `/attender-dashboard`: Attender dashboard for clinic management
  - `/doctor-dashboard`: Doctor's daily appointment view

## Backend Architecture

- Node.js Express server
- PostgreSQL database with Drizzle ORM
- RESTful API design pattern
- Migration system for database schema evolution

## Common Modification Patterns

### 1. Adding a New Field to Appointments

1. Update `shared/schema.ts` to include the new field
2. Create a migration in `migrations/` folder
3. Update relevant API endpoints in `routes.ts`
4. Update frontend components to display/edit the field

### 2. Adding a New Appointment Status

1. Add the status to `appointmentStatuses` array in `shared/schema.ts`
2. Update status handling in appointment management components
3. Add appropriate notification logic in `notification.ts`
4. Update token progress calculations if needed

### 3. Modifying Doctor Availability Logic

1. Update `getDoctorAvailability` and related methods in `storage.ts`
2. Adjust the doctor presence logic in `routes.ts`
3. Update the attender dashboard to reflect the changes

### 4. Enhancing Notification System

1. Add new notification types in the notification service
2. Implement additional triggers in relevant routes
3. Update frontend notification display components
4. Adjust notification polling strategy if needed

## Performance Considerations

1. **Database Optimization**
   - Indexes on frequently queried fields
   - Pagination for large result sets
   - Caching strategies for frequently accessed data

2. **Frontend Optimization**
   - Adaptive polling intervals for notifications
   - React Query caching for API responses
   - Lazy loading of components and routes

3. **Backend Optimizations**
   - Query optimization for token calculations
   - Batch processing of notifications
   - Rate limiting on API endpoints

## Deployment Architecture

The application uses a traditional client-server architecture:
- Frontend: Static files served from a CDN or web server
- Backend: Node.js server deployed to a cloud platform
- Database: PostgreSQL database instance
- Assets: Stored in cloud storage or CDN

## Extending the Application

New features should follow these principles:
1. Maintain consistent error handling and validation
2. Follow existing patterns for database access
3. Update documentation when adding significant features
4. Ensure backward compatibility with existing clients
5. Consider mobile responsiveness for all UI changes

## Password Management

### Password Reset Tool
A command-line tool is available to reset user passwords:

```bash
npm run reset-password -- <username> <new_password>
```

Example usage:
```bash
# Reset a patient's password
npm run reset-password -- test.patient newpassword123

# Reset a doctor's password
npm run reset-password -- doctor newpassword123

# Reset an attender's password
npm run reset-password -- attender newpassword123
```

The tool:
1. Uses the same scrypt hashing as the authentication system
2. Properly formats the hash with salt
3. Updates the user's password in the database
4. Provides clear feedback about the new credentials

This is useful for:
- Resetting forgotten passwords
- Setting up new user accounts
- Emergency access recovery
- System administration tasks

Note: This is a high-level guide to understanding the ClinicFlow application architecture. For detailed implementation details, refer to the source code and inline documentation. 