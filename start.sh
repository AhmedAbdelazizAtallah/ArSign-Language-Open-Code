#!/usr/bin/env bash
set -euo pipefail

MODEL_DIR="models"
MODEL_PATH="${MODEL_DIR}/best.onnx"

MODEL_URL="${MODEL_URL:-https://github.com/AhmedAbdelazizAtallah/ArSign-Language-Open-Code/releases/download/v1.0.0/best.onnx}"

mkdir -p "${MODEL_DIR}"

if [ ! -f "${MODEL_PATH}" ]; then
  echo "Downloading model from: ${MODEL_URL}"
  curl -fL --retry 3 -o "${MODEL_PATH}" "${MODEL_URL}"
  if [ ! -s "${MODEL_PATH}" ]; then
    echo "ERROR: Download failed - model file is empty."
    rm -f "${MODEL_PATH}"
    exit 1
  fi
  echo "Model downloaded successfully."
else
  echo "Model already present."
fi

PORT="${PORT:-8000}"
echo "Starting Arabic Sign Language AI on port ${PORT} ..."
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT}"
