# Digital Talent Management System

DTMS is a role-based task workflow app built with React in `frontnd` and Node.js/Express in `backend`.

## What It Does

- Admins create tasks and review submissions
- Users submit task updates with notes and attachments
- Admins can approve or reject a task and assign a numeric score
- When a review is saved, the user receives an automatic email with the score and feedback
- A leaderboard ranks users by completed tasks with avatars and progress indicators
- Task discussion threads support comments, replies, and timestamps under each task

## Frontend Highlights

- Role-based dashboard navigation
- Task list with search, filtering, and responsive table layout
- Submission details modal with review history and score display
- Admin review modal for decision, score, and feedback entry
- Leaderboard page with podium-style top ranks and ranked progress bars
- Shared discussion panel inside task drawers for users and admins

## Backend Highlights

- Task review payload stores `decision`, `score`, `feedback`, `reviewedAt`, and `reviewedBy`
- Review emails are sent automatically to the user after admin scoring
- Submission notifications are still sent to the admin when a user uploads work

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run start
```

3. If you want to run the backend separately:

```bash
npm run server:start
```

## Environment Notes

- Copy `.env.example` to `.env` and set the required values
- Email delivery uses the configured SMTP settings
- If SMTP is not configured, the app falls back to logging the email preview in the server console
