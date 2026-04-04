@echo off
title Pixel Mafia - Selena Bot
cd /d "%~dp0"
echo.
echo ========================================
echo    Pixel Mafia - Selena Bot
echo ========================================
echo.
echo Verificando dependencias...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    echo Descarga: https://nodejs.org
    pause
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado
    echo Descarga: https://python.org
    pause
    exit /b 1
)

where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] ffmpeg no encontrado en PATH
    echo El servidor en la nube lo tiene, pero para local necesitas instalarlo
)

echo [OK] Node.js: 
node --version
echo.
echo [OK] Python:
python --version
echo.
echo [OK] ffmpeg:
ffmpeg -version 2>nul | findstr "ffmpeg"
echo.
echo ========================================
echo Iniciando bot...
echo ========================================
echo.

node bot.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El bot se cerro con error
    pause
)
