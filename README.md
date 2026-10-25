# FLEXI Expense Tracker

A full-stack expense tracker with authentication, a dashboard, transaction CRUD, category filters, monthly budgets, and MongoDB persistence.

## Stack
- Frontend: React, Vite, HTML, CSS, JavaScript, Recharts
- Backend: Node.js, Express, Mongoose
- Database: MongoDB (local MongoDB Community Server or MongoDB Atlas)
- Authentication: bcrypt password hashing + JWT

## Requirements
- Node.js 18+ (Node 20+ recommended)
- npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- VS Code (recommended)

## 1. Configure MongoDB
### Local MongoDB
Start your MongoDB service. The default connection used in `server/.env` is:
`mongodb://127.0.0.1:27017/flexi_expense_tracker`

Open MongoDB Compass and connect to that same URI. The database and collections are created when the app first writes data.

### MongoDB Atlas
Create a database user and allow your current IP in Atlas Network Access. Copy the connection string into `MONGO_URI` in `server/.env`. Do not commit your `.env` file.

## 2. Install dependencies
From this project folder:
```bash
npm install
npm run install:all
```

## 3. Set up environment variables
Copy `server/.env.example` to `server/.env`, then set a long random `JWT_SECRET`.
On macOS/Linux:
```bash
cp server/.env.example server/.env
```
On Windows PowerShell:
```powershell
Copy-Item server/.env.example server/.env
```

## 4. Run the application
From the project root:
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

Register an account from the UI. Then add income/expense transactions and set a monthly budget. Data is scoped to the signed-in user.

## 5. Verify persistence in MongoDB Compass
1. Connect Compass to the URI in `server/.env`.
2. Open `flexi_expense_tracker`.
3. Inspect `users`, `transactions`, and `budgets`.
4. Add a transaction in the app and refresh Compass. It should appear in `transactions`.
5. Refresh the app or sign out/in; records should still be present.

## Features
- Register and login
- Password hashing and signed JWT tokens
- Protected API endpoints
- Summary cards for income, expenses, balance and savings rate
- Income vs expense chart and category breakdown
- Create, edit and delete transactions
- Search and filter by type/category
- Monthly budget per category, with progress indicators
- Responsive layout

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary?month=YYYY-MM`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/budgets?month=YYYY-MM`
- `POST /api/budgets`
- `DELETE /api/budgets/:id`

All endpoints except register, login and health require `Authorization: Bearer <token>`.

## Troubleshooting
- **MongoDB connection error:** confirm the service is running and `MONGO_URI` is correct.
- **Port already in use:** change `PORT` in `server/.env` or stop the other process.
- **Frontend can't reach API:** confirm server is running on port 5000 and `VITE_API_URL` in `client/.env` matches.
- **Atlas authentication failure:** check database username/password, URL-encode special characters, and verify IP access.
- **No data in Compass:** make sure Compass uses the exact same MongoDB URI as the backend.

## Security notes
This is a learning project, not a production financial service. Use HTTPS in deployment, keep JWT secrets private, add refresh-token/session management and stronger operational controls before production. Never store bank credentials or card numbers in this app.
