#!/bin/sh
# Make this folder a git repository with one initial commit.
# Safe to run twice: it does nothing if a repo exists.
cd "$(dirname "$0")" || exit 1
command -v git >/dev/null 2>&1 || { echo "Git is not installed. Install it, then run this again."; exit 1; }
if [ -d .git ]; then echo "This folder is already a git repository."; git log --oneline -5; exit 0; fi
git init -b main
git add -A
git commit -m "EasyScreenplay 1.0 — a screenplay page, a format doctor, the story tools and the drills"
echo
echo "Done. This folder is now a git repository on branch main."
git log --oneline
