@echo off
start "" /B cmd /c call "%~dp0start-server.cmd"
call npm run client:dev
