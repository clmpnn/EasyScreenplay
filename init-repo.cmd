@echo off
REM Make this folder a git repository with one initial commit.
REM Double-click it once. Safe to run twice: it does nothing if a repo exists.
cd /d "%~dp0"
where git >nul 2>nul || (
  echo Git is not installed, or not on PATH.
  echo Install it from https://git-scm.com/download/win and run this again.
  pause & exit /b 1
)
if exist ".git" (
  echo This folder is already a git repository.
  git -c color.ui=always log --oneline -5
  pause & exit /b 0
)
git init -b main
git add -A
git commit -m "EasyScreenplay 1.0 — a screenplay page, a format doctor, the story tools and the drills"
echo.
echo Done. This folder is now a git repository on branch main.
git log --oneline
pause
