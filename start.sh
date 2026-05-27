#!/bin/bash
export PYTHONPATH=/opt/render/project/src/backend
cd /opt/render/project/src/backend
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
