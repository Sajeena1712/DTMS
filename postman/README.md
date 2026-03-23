# 🧪 Postman API Testing Guide

This guide helps you quickly set up and test all DTMS API endpoints using Postman.

---

## 📥 Import Collections

### Step 1: Open Postman
- Download from [postman.com](https://www.postman.com/downloads/)
- Sign up / Login

### Step 2: Import Collection
1. **Workspace → Import**
2. Select `DTMS.postman_collection.json`
3. Click **Import**

### Step 3: Import Environment
1. **Environments → Import**
2. Select `DTMS.postman_environment.json`
3. Click **Import**

### Step 4: Select Environment
1. Click environment dropdown (top-right)
2. Select **DTMS**

---

## 🔑 Authentication Workflow

### Step 1: Register New User
```
POST /api/auth/register
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123",
  "confirmPassword": "SecurePass@123"
}
```

### Step 2: Verify Email
- Check backend console for verification link
- Copy token from console output
- Use in next step:
```
GET /api/auth/verify-email/{{token}}
```

### Step 3: Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

✅ **Token auto-saves** to `{{token}}` environment variable

---

## 📋 API Testing Checklist

### ✅ Authentication Endpoints
- [ ] `POST /auth/register` - Create user
- [ ] `POST /auth/login` - Get JWT token
- [ ] `GET /auth/me` - Get current user
- [ ] `POST /auth/forgot-password` - Request reset
- [ ] `POST /auth/reset-password/:token` - Reset password
- [ ] `GET /auth/verify-email/:token` - Verify email

### ✅ Task Endpoints (Requires Auth Token)
- [ ] `GET /tasks` - List all tasks
- [ ] `POST /tasks` - Create task (admin)
- [ ] `PUT /tasks/:taskId` - Update task
- [ ] `DELETE /tasks/:taskId` - Delete task (admin)

### ✅ User Endpoints (Admin Only)
- [ ] `GET /user/dashboard` - Get stats
- [ ] `GET /user` - List all users

---

## 🔄 Common Testing Flows

### Flow 1: Admin - Create & Assign Task

```
1. Login as admin@dtms.com
2. POST /api/tasks
   {
     "title": "Design new dashboard",
     "description": "Create UI mockups",
     "deadline": "2026-04-01",
     "assignedTo": "user_id_here",
     "status": "Pending"
   }
3. PUT /api/tasks/:taskId
   {
     "status": "In Progress"
   }
```

### Flow 2: User - Submit Task

```
1. Login as regular user
2. GET /api/tasks (view assigned)
3. PUT /api/tasks/:taskId
   {
     "status": "Completed",
     "submission": {
       "text": "Task completed successfully",
       "fileName": "project.zip",
       "fileUrl": "https://..."
     }
   }
```

---

## 🔐 Using Environment Variables

### Automatic Variables
```
{{token}}        - JWT token (auto-set after login)
{{base_url}}     - API base URL (http://localhost:3000/api)
{{api_port}}     - API port (3000)
```

### Using in Headers
Most requests already include:
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

### Using in URLs
```
GET {{base_url}}/tasks
GET {{base_url}}/user/dashboard
```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Unauthorized (401)` | Login again, copy token to body: `Authorization: Bearer {{token}}` |
| `Forbidden (403)` | Use admin account or check role permissions |
| `Not Found (404)` | Verify task/user IDs are correct |
| `Bad Request (400)` | Check JSON format, required fields |
| `CORS Error` | Ensure backend is running on port 3000 |

---

## 📝 Pre-request Scripts

To auto-set tokens, use pre-request script:

```javascript
// Get token from login response
const token = pm.response.json().token;
pm.environment.set("token", token);
```

*(Already included in collection)*

---

## 💾 Export Results

1. Right-click request → **Run Collection**
2. Select **Run Summary**
3. Export results as HTML/JSON

---

## 🔗 Useful Links

- [Postman Docs](https://learning.postman.com/)
- [REST API Docs](../PRODUCTION_README.md)
- [Backend Setup](../server/README.md)

---

## ⚡ Pro Tips

1. **Use Collections Runner** for batch testing
2. **Set up Tests** to auto-validate responses
3. **Use Pre-request Scripts** for setup logic
4. **Organize requests** in folders
5. **Document** each endpoint with examples
6. **Share collection** with team for collaboration

---

**Happy testing! 🚀**
