# Dockerfile for Arabic Sign Language Platform (Backend + ONNX model)
# Optimized for Render's free plan (512 MB RAM). Downloads the model at
# startup via start.sh instead of baking it into the image.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System libraries required by OpenCV + curl to download the model.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better build caching).
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code.
COPY backend/ ./backend/
COPY ai/ ./ai/

# Copy and enable the startup script (downloads model, then runs the app).
COPY start.sh .
RUN chmod +x start.sh

# Render provides $PORT at runtime; document 8000 for local use.
EXPOSE 8000

# start.sh downloads best.onnx (if missing) then launches uvicorn.
CMD ["./start.sh"]
