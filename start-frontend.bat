@echo off
REM Idi u frontend folder
cd /d C:\DATA\FastAPI-React-CRM\frontend

REM (opciono) log folder, da vidimo greške ako se desi
if not exist C:\DATA\FastAPI-React-CRM\logs mkdir C:\DATA\FastAPI-React-CRM\logs

REM Pokreni npm start i upiši output u log
"C:\Program Files\nodejs\npm.cmd" start >> C:\DATA\FastAPI-React-CRM\logs\frontend.log 2>&1
