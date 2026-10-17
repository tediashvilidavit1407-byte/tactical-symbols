@echo off
chcp 65001 >nul
node "%~dp0tools\validate-data.js"
pause
