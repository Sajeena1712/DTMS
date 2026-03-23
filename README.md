Project Overview

DTMS is a full-stack “Digital Talent Management System” for managing users, tasks, dashboards, submissions, reviews, email notifications, and account access. It has a React/Vite frontend and an Express backend with MongoDB, Prisma, and Mongoose working together.

Main Tech Stack

Frontend: React 18, Vite, React Router, Framer Motion, React Hook Form, Zod, Recharts, Tailwind CSS
Backend: Express, Prisma, Mongoose, JWT, Nodemailer, bcryptjs, CORS, Morgan, cookie-parser
Data: MongoDB plus Prisma-backed task/user workflow, with local Mongo setup and a replica set requirement
How It Runs

Root scripts in package.json
Server scripts in package.json
Dev mode runs the frontend and backend together
The backend starts with local Mongo bootstrap and then launches the API server
Frontend Structure

App entry and routing live in App.jsx
Auth/session state lives in AuthContext.jsx
Task state and API syncing live in TaskContext.jsx
Shared API client lives in client.js
Frontend Pages

Login, register, password reset, and email verification pages
Admin dashboard, user dashboard, analytics, calendar, settings, team, users
Task list, task create, and task edit pages
Recruitment/application pages
Key page files:

AdminDashboardPage.jsx
UserDashboardPage.jsx
TaskListPage.jsx
Frontend UX Pattern

The app uses a premium, glassy UI style with animated transitions and dark/light contrast
Auth and dashboard screens use reusable layout shells
The task flow now supports:
user click-to-open progress form
admin task review modal
task submission review with attachment handling
Useful components:

AppShell.jsx
TaskCard.jsx
TaskProgressModal.jsx
TaskSubmissionModal.jsx
Backend Structure

Express app setup in app.js
Server bootstrap in server.js
Mongo connection bootstrap in db.js
Mail config in mailer.js
Backend API Surface

Auth routes in authRoutes.js
Task routes in taskRoutes.js
User routes in userRoutes.js
Main backend endpoints include:

Auth: register, login, logout, verify email, resend verification, forgot/reset password, current user
Tasks: list, create, update, delete
Users: dashboard data and user list for admin
Auth Flow

Registration sends a verification email
Login is blocked until email verification
Forgot password sends a reset link
Resend verification is supported for unverified users
Primary file:

authController.js
Task Flow

Admin can create, edit, assign, review, approve, reject, and delete tasks
Users can open an assigned task, submit progress, attach files, and update status
Task submissions support notes, links, and uploaded files
Admin review supports PDF preview and open/download behavior for ZIP and document files
Primary file:

taskController.js
Email System

Email templates are centralized and styled as premium HTML cards
DTMS sends:
verification emails
password reset emails
task assignment emails
task submission notifications
approval/rejection emails
deadline reminders
Key files:

emailTemplates.js
taskReminderJob.js
Data Models

Prisma schema is in schema.prisma
Mongo/Mongoose models also exist under server/src/models
The project uses a hybrid persistence setup, which is why the bootstrap and schema management are fairly involved
Uploads and Attachments

Submitted files are stored under server/uploads
The server exposes /uploads as static content
The admin review panel can open or preview supported submission types
Role-Based UX

Admin users get dashboards, team/user management, and task administration
Regular users get personal dashboards and task progress submission views
Route guards and role checks are enforced in the frontend and backend
Notable Supporting Files

constants.js
utils.js
authMiddleware.js
adminSeed.js
tasksSeed.js
Current Repo Notes

.gitattributes was added to normalize line endings
.gitignore ignores local Mongo data and uploaded files
README.md is missing, but there is a fix note at README-FIX.md
