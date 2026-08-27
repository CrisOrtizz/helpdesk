#!/bin/sh
set -e
echo "[start] Running Alembic migrations..."
alembic upgrade head
echo "[start] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
