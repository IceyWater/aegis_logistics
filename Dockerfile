FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    AEGIS_MODELS_DIR=/app/models

WORKDIR /app
COPY api/requirements.txt /app/api/requirements.txt
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r /app/api/requirements.txt

COPY api /app/api
COPY data /app/data
COPY models /app/models

WORKDIR /app/api
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
