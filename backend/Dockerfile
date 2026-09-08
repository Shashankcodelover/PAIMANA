# Single-service Dockerfile: builds the React frontend, then serves it + the FastAPI API from one
# uvicorn process on one port. No multi-stage orchestration beyond what's needed to build the
# frontend assets once.

FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# ML + data pipeline + backend all live under one image
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY data/ ./data/
COPY ml/ ./ml/
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Ensure a clean dataset + trained models exist inside the image even if the repo's generated
# artifacts weren't committed (data/projects_clean.csv, ml/models/*.joblib are .gitignore'd).
RUN if [ ! -f data/projects_clean.csv ]; then python3 data/seed_data.py; fi
RUN if [ ! -f ml/models/regressor.joblib ]; then \
      cd ml && PYTHONPATH=. python3 model.py && python3 ablation.py; \
    fi

WORKDIR /app/backend
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
