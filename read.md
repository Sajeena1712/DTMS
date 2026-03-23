# Digital Talent Management System

DTMS is a role-based task and workflow management app for admins and users.

## Features

- Admin and user authentication
- Task creation, assignment, editing, and deletion
- Task progress updates and submission tracking
- Deadline-based task visibility and late-access handling
- Dashboard, calendar, analytics, and team views

## Tech Stack

- Frontend: React, Vite, Framer Motion, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB with Prisma

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run start
```

3. Run the server separately if needed:

```bash
npm run server:start
```

## Notes

- Copy `.env.example` to `.env` and set the required environment variables before running.
- The admin dashboard can approve late task access by adding a late submission reason.
