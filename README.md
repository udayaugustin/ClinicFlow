# Clinic Management System

## Local Development Setup

### Prerequisites
- Node.js (v18 or later)
- PostgreSQL database

### Setup Steps

1. **Clone the repository and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
Create a `.env` file in the root directory with the following variables:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/clinic_db
SESSION_SECRET=your_session_secret
```

3. **Initialize the database**
```bash
npm run db:push
```

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts
- `npm run dev` - Start development server
- `npm run db:push` - Push database schema changes
- `npm run build` - Build for production
- `npm run start` - Start production server

### Default Users
After setting up, you can log in with these test accounts:
- Doctor: username: `doctor1`, password: `password123`
- Patient: username: `patient1`, password: `password123`
- Attender: username: `attender1`, password: `password123`


DATABASE_URL="postgresql://neondb_owner:npg_tXArKyUqD90B@ep-dry-cell-a5brg9b5.us-east-2.aws.neon.tech/neondb?sslmode=require" npm run db:migrate