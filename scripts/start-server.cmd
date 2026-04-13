@echo off
set PORT=5000
set CLIENT_URL=http://localhost:5173
set JWT_SECRET=local-dev-secret
set DATABASE_URL=mongodb://127.0.0.1:27018/dTMS?replicaSet=rs0
call npm --prefix backend run start
