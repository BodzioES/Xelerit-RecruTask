#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
python - <<'PY'
import os
import sys
import time

import psycopg

dsn = os.environ["DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://")
deadline = time.time() + 60

while True:
    try:
        with psycopg.connect(dsn, connect_timeout=3):
            print("PostgreSQL is ready.")
            break
    except psycopg.OperationalError:
        if time.time() > deadline:
            print("PostgreSQL did not become available in time.", file=sys.stderr)
            sys.exit(1)
        time.sleep(2)
PY

echo "Applying database migrations..."
alembic upgrade head

# Allow running ad-hoc commands (e.g. `pytest`) inside the image.
if [ "$#" -gt 0 ]; then
    exec "$@"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
