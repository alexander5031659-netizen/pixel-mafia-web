@echo off
title Pixel Mafia - Panel de Control
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    pause
    exit /b 1
)

npx electron .
