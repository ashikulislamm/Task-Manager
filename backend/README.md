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
│   └── task.controller.js    # Task CRUD controllers
├── services/
│   ├── auth.service.js       # Core business logic for authentication
│   └── task.service.js       # Core business logic for tasks & ownership
├── models/
│   ├── User.model.js         # Mongoose User Schema
│   └── Task.model.js         # Mongoose Task Schema
├── routes/
│   ├── auth.routes.js        # Auth endpoint routers
│   ├── task.routes.js        # Task endpoint routers
│   └── index.js              # Aggregated root API router
├── middlewares/
│   ├── auth.middleware.js    # JWT verification & req.user attachment
│   ├── error.middleware.js   # Central global error handler
│   └── validate.middleware.js# Zod request validation middleware
├── validators/
│   ├── auth.validation.js    # Auth Zod validation schemas
│   └── task.validation.js    # Task Zod validation schemas
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
