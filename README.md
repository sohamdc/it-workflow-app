
# IT Workflow Management App

This app replaces a company's Excel sheet for tracking IT projects. It works like this:

- A **Super Admin** builds a checklist template (called an SOP) — steps like Requirements, Design, Testing, Go-Live.
- An **Admin** creates a project using that checklist. The app copies the checklist steps into the new project automatically.
- An **IT Member** updates each step's status as work happens (Not Started, In Progress, Blocked, On Hold, Completed).
- A **Client** can log in and see the project's progress, but only a simplified, read-only view — some steps and details are hidden from them.

## Tech used

- **Backend:** Node.js, Express, PostgreSQL (database), Prisma (makes talking to the database easier), JWT (for login/security)
- **Frontend:** React, Redux (keeps track of app data), React Router (handles pages), Axios (talks to the backend)

## Why PostgreSQL

The data in this app (users, roles, projects, steps) is naturally connected — a project has steps, a step has a status history, and so on. PostgreSQL is built for exactly this kind of connected data, and it also supports **transactions**, meaning several related changes can be saved together safely, or not saved at all if something goes wrong.

## How to run this project

### 1. Backend (the server)

Open a terminal:
```bash
cd server
npm install
```

Create a file called `server/.env` and copy the format from `server/.env.example`. Fill in:
PORT=5000
DATABASE_URL=your_postgres_connection_string
JWT_ACCESS_SECRET=a_random_secret
JWT_REFRESH_SECRET=another_random_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
CLIENT_URL=http://localhost:5173


Then set up the database and fill it with starter data:
```bash
npx prisma migrate dev
npm run seed
```

Start the backend:
```bash
npm run dev
```
It will run at `http://localhost:5000`.

### 2. Frontend (the website)

```bash
cd client
npm install
```

Create a file called `client/.env`:

VITE_API_URL=http://localhost:5000/api


Start it:
```bash
npm run dev
```
It will run at `http://localhost:5173`. Open that link in your browser.

**Permissions come from the database, not the code.** The app never checks "is this person an Admin?" directly. Instead, it checks "does this person have permission to do this specific action?" Permissions are stored as data, so they can be changed without touching code.
- **Once a checklist is published, it can't be changed.** If someone edits the checklist later, it creates a new version — old projects keep using the version they were built with.
- **Clients only get safe, filtered data.** The server removes hidden information (like internal notes or hidden steps) before sending anything to a Client — it's not just hidden on the screen, it's never sent at all.
- **Login tokens refresh automatically and safely.** Each login gives a short-term pass (15 minutes) and a longer one (7 days) stored safely in a cookie. Every time it refreshes, the old one stops working, so a stolen token can't be reused for long.