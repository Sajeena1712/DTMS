Digital Talent Management System (DTMS)
1. Project Overview

The Digital Talent Management System (DTMS) is a full-stack web application designed to manage organizational talent workflows such as user registration, task assignment, task submission, performance tracking, and administrative reviews.

The system allows administrators to create and manage tasks, while users can view assigned tasks, submit their work, and track progress through an interactive dashboard. The application also integrates email notifications, authentication security, and role-based access control.

DTMS is built using a modern full-stack architecture with a React frontend and an Express backend, supported by MongoDB for data storage and Prisma/Mongoose for database management.

2. Technology Stack
Frontend Technologies

The frontend is developed using modern JavaScript frameworks and UI libraries.

React 18 – Component-based UI development
Vite – Fast frontend build tool
React Router – Client-side routing
Framer Motion – UI animations
React Hook Form – Form management
Zod – Form validation
Recharts – Data visualization charts
Tailwind CSS – Utility-first CSS styling
Backend Technologies

The backend API server is built using Node.js and Express.

Express.js – REST API server
Prisma ORM – Database schema and queries
Mongoose – MongoDB data modeling
JWT (JSON Web Token) – Secure authentication
bcryptjs – Password hashing
Nodemailer – Email notifications
Morgan – API request logging
CORS – Cross-origin support
cookie-parser – Cookie-based session handling
3. Database System

The project uses MongoDB as the primary database.

Features include:

Local MongoDB server setup
Replica set configuration for Prisma compatibility
Hybrid persistence using Prisma + Mongoose

This allows the system to support both schema-driven database management and flexible document storage.

4. Application Architecture

DTMS follows a full-stack architecture consisting of:

Frontend (React + Vite)
⬇
Backend API (Express Server)
⬇
Database Layer (MongoDB + Prisma + Mongoose)

This layered architecture ensures:

modular development
clean API communication
scalable system design
5. Project Execution

The project runs in development mode using scripts defined in package.json.

Development Mode

Running the project starts both servers simultaneously:

React frontend
Express backend API

The backend initializes:

MongoDB connection
local database bootstrap
API server startup
6. Frontend Architecture
Main Entry

The application entry point and routing system are defined in:

App.jsx

State Management

Two main contexts manage application state.

AuthContext.jsx

Handles:

login session
authentication state
current user

TaskContext.jsx

Handles:

task data
task API synchronization
submission updates
Shared API Client

API requests are centralized in:

client.js

This file handles communication between the frontend and backend.

7. Frontend Pages

The application includes multiple functional pages.

Authentication Pages
Login Page
Register Page
Email Verification Page
Forgot Password Page
Reset Password Page
Dashboard Pages
AdminDashboardPage.jsx
UserDashboardPage.jsx

These dashboards provide:

performance analytics
task statistics
activity summaries
Task Management Pages
TaskListPage.jsx
Task Create Page
Task Edit Page

These pages allow administrators to manage tasks and users to track their assigned work.

Other Functional Pages
Calendar Page
Settings Page
Team Management Page
User Management Page
Recruitment / Application Pages
8. User Interface Design

The system uses a premium glass-style UI design with animated transitions.

Features include:

dark/light contrast themes
modern dashboard layout
reusable layout components
smooth page transitions
Key UI Components

AppShell.jsx

Main layout wrapper used across dashboard pages.

TaskCard.jsx

Displays task information and status.

TaskProgressModal.jsx

Allows users to submit task progress.

TaskSubmissionModal.jsx

Used by admins to review submitted work.

9. Backend Architecture
Core Server Files

app.js

Configures the Express application.

server.js

Bootstraps the backend server.

db.js

Handles MongoDB connection initialization.

mailer.js

Configures the Nodemailer email system.

10. Backend API Routes

The backend exposes several API endpoints.

Authentication Routes

Located in:

authRoutes.js

Includes:

register
login
logout
email verification
resend verification
forgot password
reset password
get current user
Task Routes

Located in:

taskRoutes.js

Includes:

list tasks
create task
update task
delete task
submit task progress
review submissions
User Routes

Located in:

userRoutes.js

Includes:

user dashboard data
admin user list
team management
11. Authentication System

The system uses JWT-based authentication.

Security features include:

encrypted passwords using bcrypt
email verification before login
password reset via email
secure authentication middleware

Main file:

authController.js

12. Task Workflow
Admin Capabilities

Administrators can:

create tasks
assign tasks to users
edit tasks
review submissions
approve or reject work
delete tasks
User Capabilities

Users can:

view assigned tasks
open task details
submit progress updates
upload attachments
add notes or links
Submission Review

Admins can:

preview PDF files
open or download ZIP files
review attachments
approve or reject submissions

Main controller:

taskController.js

13. Email Notification System

DTMS includes a fully automated email notification system.

Emails are styled using premium HTML card templates.

The system sends emails for:

account verification
password reset
task assignment
task submission alerts
approval/rejection results
deadline reminders

Key files:

emailTemplates.js
taskReminderJob.js
14. File Upload System

Task submission attachments are stored in:

server/uploads

The backend exposes uploads using:

/uploads

Supported file handling includes:

PDF preview
ZIP download
document access
15. Role-Based Access Control

DTMS uses role-based permissions.

Admin Access

Admins can access:

admin dashboard
team management
task management
user management
User Access

Regular users can access:

personal dashboard
assigned tasks
task submission interface

Route protection is enforced in both:

frontend route guards
backend middleware
16. Supporting Utility Files

Several supporting files help manage system configuration.

constants.js
utils.js
authMiddleware.js
adminSeed.js
tasksSeed.js
17. Repository Configuration
Version Control

.gitattributes ensures consistent line endings across systems.

Ignored Files

.gitignore excludes:

MongoDB local data
uploaded task files
node modules
