# Task Manager Backend

A production-grade, secure, and clean REST API backend for a Task Manager application. Built with **Node.js**, **Express.js**, and **MongoDB/Mongoose** using modern JavaScript (ES Modules).

---

## Tech Stack & Security

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Validation**: Zod (for request body, query, and params sanitization)
- **Security**:
  - **Helmet**: Secures HTTP headers to protect against common web vulnerabilities.
  - **CORS**: Restricted access with support for credentials (cookies).
  - **bcrypt**: Password hashing using 10 salt rounds.
  - **JWT**: HTTP-only, secure, strict SameSite cookies for robust authentication.
- **Logger**: Morgan (dev logs)
- **Error Handling**: Standard custom `ApiError` class and a centralized Global Error middleware.

---

## Folder Structure

The project implements a clean layered MVC architecture directly under `src/`:

```text
src/
├── config/
│   └── db.js                 # Mongoose connection setup
├── controllers/
│   ├── auth.controller.js    # Auth route controllers (register, login, etc.)
│   ├── task.controller.js    # Task CRUD controllers
│   ├── analytics.controller.js # Productivity metrics and trends controller
│   ├── activity.controller.js  # User activity log controller
│   └── focus.controller.js     # Pomodoro focus session controller
├── services/
│   ├── auth.service.js       # Core business logic for authentication
│   ├── task.service.js       # Core business logic for tasks & ownership
│   ├── analytics.service.js  # Productivity data compiler and aggregator
│   ├── activity.service.js   # Service tracking and compiling activities
│   └── focus.service.js      # Service managing focus sessions
├── models/
│   ├── User.model.js         # Mongoose User Schema
│   ├── Task.model.js         # Mongoose Task Schema (with completedAt & recurrence)
│   ├── Activity.model.js     # Mongoose Activity Log Schema
│   └── FocusSession.model.js # Mongoose Focus Session Pomodoro Schema
├── routes/
│   ├── auth.routes.js        # Auth endpoint routers
│   ├── task.routes.js        # Task endpoint routers
│   ├── analytics.routes.js   # Analytics endpoint routers
│   ├── activity.routes.js    # Activity timeline endpoint routers
│   ├── focus.routes.js       # Pomodoro focus session routers
│   └── index.js              # Aggregated root API router
├── middlewares/
│   ├── auth.middleware.js    # JWT verification & req.user attachment
│   ├── error.middleware.js   # Central global error handler
│   └── validate.middleware.js# Zod request validation middleware
├── validators/
│   ├── auth.validation.js    # Auth Zod validation schemas
│   └── task.validation.js    # Task Zod validation schemas (with recurrence refinement)
├── utils/
│   ├── ApiError.js           # Custom API error formatting class
│   ├── ApiResponse.js        # Standard success response formatter
│   ├── asyncHandler.js       # Wrapper to bypass try/catch blocks
│   ├── generateToken.js      # JWT signing utility (7 days duration)
│   └── cookieOptions.js      # Consolidated cookie configuration
├── constants/
│   └── taskStatus.js         # Central status list ("todo", "in-progress", "done")
├── app.js                    # Express app instantiation and configuration
└── server.js                 # Database connection execution and listener trigger
```

---

## Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a remote MongoDB Atlas URI)

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root folder (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Provide values in `.env`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/task-manager
   JWT_SECRET=your_jwt_secret_key_here
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```

3. **Run in Development Mode**
   Uses Node.js's built-in `--watch` flag to reload the server upon code changes:
   ```bash
   npm run dev
   ```

4. **Start in Production Mode**
   ```bash
   npm start
   ```

---

## API Documentation

All routes (except health-check) are prefixed with `/api`.

### Standard Success Response Format
```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional field containing validation array if applicable
}
```

---

### 1. Authentication Endpoints

#### **Register User**
- **Route**: `POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response**: `201 Created`
  - *Note*: Sets an HTTP-only cookie named `token` containing the JWT.

#### **Login User**
- **Route**: `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response**: `200 OK`
  - *Note*: Sets an HTTP-only cookie named `token` containing the JWT.

#### **Logout User**
- **Route**: `POST /api/auth/logout`
- **Response**: `200 OK`
  - *Note*: Clears the authentication cookie `token`.

#### **Get Profile (Me)**
- **Route**: `GET /api/auth/me`
- **Headers/Cookies**: Cookie `token` (JWT) is required.
- **Response**: `200 OK`
  - *Note*: Returns the profile of the current logged-in user without the password.

---

### 2. Task Endpoints

*All task endpoints require user authentication via cookie `token` or Authorization Header (`Bearer <JWT>`).*

#### **Create Task**
- **Route**: `POST /api/tasks`
- **Request Body**:
  ```json
  {
    "title": "Build Backend REST API",
    "description": "Implement authentication and task routes in Node/Express",
    "status": "in-progress" // Optional. Defaults to "todo" if omitted.
  }
  ```
- **Response**: `201 Created`

#### **Get All Tasks**
- **Route**: `GET /api/tasks`
- **Response**: `200 OK`
  - *Note*: Returns only the tasks created by the logged-in user.

#### **Get Single Task**
- **Route**: `GET /api/tasks/:id`
- **Path Parameter**: `id` - 24-character hexadecimal MongoDB ObjectId.
- **Response**: `200 OK`
  - *Note*: Throws `403 Forbidden` if the task belongs to another user, or `404 Not Found` if it does not exist.

#### **Update Task**
- **Route**: `PATCH /api/tasks/:id`
- **Path Parameter**: `id` - MongoDB ObjectId.
- **Request Body** (all fields optional):
  ```json
  {
    "title": "Updated task title",
    "description": "Updated task description",
    "status": "done" // Must be one of: "todo", "in-progress", "done"
  }
  ```
- **Response**: `200 OK`

#### **Delete Task**
- **Route**: `DELETE /api/tasks/:id`
- **Path Parameter**: `id` - MongoDB ObjectId.
- **Response**: `200 OK`

---

### 3. Productivity Analytics Endpoints

#### **Get Analytics Overview**
- **Route**: `GET /api/analytics/overview`
- **Response**: `200 OK`
  - **Payload Structure**:
    ```json
    {
      "success": true,
      "message": "Analytics retrieved successfully",
      "data": {
        "completionRate": 87,
        "totalTasks": 33,
        "completedTasks": 22,
        "overdueTasks": 3,
        "weekly": { "created": 14, "completed": 11 },
        "monthly": { "created": 42, "completed": 35 },
        "statusDistribution": { "todo": 6, "inProgress": 5, "done": 22 },
        "priorityDistribution": { "critical": 3, "high": 7, "medium": 10, "low": 4 },
        "weeklyTrend": [ { "date": "Jun 25", "created": 2, "completed": 1 }, ... ],
        "monthlyTrend": [ ... ],
        "focus": { "hoursThisWeek": 2.5, "hoursThisMonth": 12.0, "sessionsCompleted": 6 }
      }
    }
    ```

---

### 4. Activity Timeline Endpoints

#### **Get Paginated Activities**
- **Route**: `GET /api/activities`
- **Query Parameters**:
  - `page` (default 1)
  - `limit` (default 20)
- **Response**: `200 OK`
  - **Payload Structure**:
    ```json
    {
      "success": true,
      "message": "Activities retrieved successfully",
      "data": {
        "activities": [
          {
            "_id": "603f7e1b9b1e8e2b8c9d1a2b",
            "userId": "603f7e1b9b1e8e2b8c9d1a1a",
            "taskId": { "_id": "603f7e1b9b1e8e2b8c9d1a1b", "title": "Setup deploy" },
            "action": "status_changed",
            "metadata": { "title": "Setup deploy", "oldStatus": "todo", "newStatus": "done" },
            "createdAt": "2026-06-25T08:20:00.000Z"
          }
        ],
        "totalPages": 5,
        "currentPage": 1,
        "totalActivities": 94
      }
    }
    ```

---

### 5. Focus Mode Endpoints

#### **Start Focus Session**
- **Route**: `POST /api/focus/start`
- **Request Body**:
  ```json
  {
    "taskId": "603f7e1b9b1e8e2b8c9d1a1b",
    "duration": 25
  }
  ```
- **Response**: `201 Created`

#### **End Focus Session**
- **Route**: `POST /api/focus/end`
- **Request Body**:
  ```json
  {
    "status": "completed"
  }
  ```
- **Response**: `200 OK`

#### **Get Active Focus Session**
- **Route**: `GET /api/focus/current`
- **Response**: `200 OK`

#### **Get Focus Session History**
- **Route**: `GET /api/focus/history`
- **Response**: `200 OK`
