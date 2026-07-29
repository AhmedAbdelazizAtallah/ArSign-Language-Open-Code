# Deployment Guide

## Overview

This guide covers deploying the Arabic Sign Language Platform to production using Docker, Render.com, or traditional VPS.

## Prerequisites

- Docker 24+
- Docker Compose 2+
- Git
- Domain name (for HTTPS)
- SSL certificates (Let's Encrypt recommended)

---

## Option 1: Render.com (Recommended)

### Backend Service

1. Connect GitHub repository to Render
2. Create new **Web Service**
3. Configuration:
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Build Command**: (uses Dockerfile)
   - **Start Command**: (uses Dockerfile CMD)

4. Environment Variables:
   ```
   ENVIRONMENT=production
   DEBUG=false
   SECRET_KEY=<generate-secure-key>
   MODEL_PATH=/app/models/best.onnx
   USE_GPU=false
   LOG_LEVEL=INFO
   CORS_ORIGINS=https://your-frontend-domain.com
   ```

5. Health Check Path: `/health`
6. Plan: Standard (for GPU) or Starter
7. Auto-Deploy: Yes

### Frontend Service

1. Create new **Web Service**
2. Configuration:
   - **Runtime**: Docker
   - **Dockerfile Path**: `./frontend/Dockerfile`
   - **Docker Context**: `./frontend`

3. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com
   NODE_ENV=production
   ```

4. Plan: Starter
5. Auto-Deploy: Yes

### Automatic Deployments

- Push to `main` branch triggers rebuild
- Monitor in Render dashboard
- Check logs for build/runtime issues

---

## Option 2: Docker Compose (VPS)

### Server Requirements

- 2+ vCPUs
- 4+ GB RAM
- 20+ GB disk
- Ubuntu 22.04+ / Debian 12+
- NVIDIA GPU (optional, for CUDA)

### Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Clone repository
git clone https://github.com/your-org/arabic-sign-language-platform.git
cd arabic-sign-language-platform

# Configure environment
cp .env.example .env
# Edit .env with production values
nano .env
```

### Required .env for Production

```env
# Application
APP_NAME="Arabic Sign Language Platform"
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-very-secure-random-key-here
API_VERSION=v1

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Model
MODEL_PATH=models/best.onnx
USE_GPU=true
EXECUTION_PROVIDERS=CUDAExecutionProvider,CPUExecutionProvider

# Inference
CONF_THRESHOLD=0.30
IOU_THRESHOLD=0.45
MAX_DETECTIONS=100

# CORS (your domain)
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Security
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### Deploy

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check health
curl http://localhost:8000/health
```

### SSL with Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt-get install nginx certbot python3-certbot-nginx

# Configure Nginx
sudo tee /etc/nginx/sites-available/asl-platform << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # For WebSocket (future)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check (no auth)
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/asl-platform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Systemd Service (Alternative to Docker Compose)

```bash
# Backend service
sudo tee /etc/systemd/system/asl-backend.service << 'EOF'
[Unit]
Description=Arabic Sign Language Backend
After=network.target

[Service]
Type=exec
User=www-data
WorkingDirectory=/opt/asl-platform
Environment=PATH=/opt/asl-platform/venv/bin
ExecStart=/opt/asl-platform/venv/bin/gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service (Next.js standalone)
sudo tee /etc/systemd/system/asl-frontend.service << 'EOF'
[Unit]
Description=Arabic Sign Language Frontend
After=network.target

[Service]
Type=exec
User=www-data
WorkingDirectory=/opt/asl-platform/frontend
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=https://your-domain.com
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable asl-backend asl-frontend
sudo systemctl start asl-backend asl-frontend
```

---

## Option 3: Kubernetes (Advanced)

### Helm Chart Structure

```
asl-platform/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secret.yaml
```

### Key Configurations

```yaml
# values.yaml
backend:
  replicaCount: 3
  image:
    repository: ghcr.io/your-org/asl-backend
    tag: latest
  resources:
    limits:
      cpu: "2"
      memory: "4Gi"
      nvidia.com/gpu: 1
  env:
    - name: USE_GPU
      value: "true"
    - name: WORKERS
      value: "2"

frontend:
  replicaCount: 2
  image:
    repository: ghcr.io/your-org/asl-frontend
    tag: latest

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: api.your-domain.com
      paths:
        - path: /api
          pathType: Prefix
          service: backend
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
  tls:
    - secretName: asl-tls
      hosts:
        - api.your-domain.com
        - your-domain.com
```

---

## GPU Support

### Docker (NVIDIA Container Toolkit)

```bash
# Install on host
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify
docker run --rm --gpus all nvidia/cuda:12.2-base nvidia-smi
```

### Docker Compose GPU

```yaml
services:
  backend:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Render.com GPU

- Select "GPU Instance" in plan
- Set `USE_GPU=true`
- Automatic CUDA detection

---

## Monitoring & Maintenance

### Health Checks

```bash
# Backend
curl https://api.your-domain.com/health

# Frontend
curl https://your-domain.com/health

# Metrics
curl https://api.your-domain.com/api/v1/metrics
```

### Logs

```bash
# Docker Compose
docker-compose logs -f backend
docker-compose logs -f frontend

# Render.com
# View in dashboard > Logs

# Systemd
sudo journalctl -u asl-backend -f
sudo journalctl -u asl-frontend -f
```

### Updates

```bash
# Docker Compose
git pull
docker-compose up -d --build

# Render.com
# Automatic on push to main

# Systemd
git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && npm install && npm run build
sudo systemctl restart asl-backend asl-frontend
```

### Backup

```bash
# Model backup (if retrained)
cp models/best.onnx /backup/models/best.onnx.$(date +%Y%m%d)

# History export
curl https://api.your-domain.com/api/v1/history/export?format=json > /backup/history_$(date +%Y%m%d).json

# Settings backup
curl https://api.your-domain.com/api/v1/settings > /backup/settings_$(date +%Y%m%d).json
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Model not loading | Check `MODEL_PATH`, file permissions, disk space |
| GPU not detected | Install NVIDIA Container Toolkit, check `nvidia-smi` |
| CORS errors | Verify `CORS_ORIGINS` matches frontend domain exactly |
| High latency | Check GPU usage, consider batching, reduce image size |
| Out of memory | Reduce `WORKERS`, add swap, upgrade instance |
| SSL certificate | Run `certbot renew`, check Nginx config |

### Debug Commands

```bash
# Check container status
docker-compose ps

# Inspect container
docker-compose exec backend bash
docker-compose exec frontend sh

# Check GPU in container
docker-compose exec backend nvidia-smi

# Test model directly
docker-compose exec backend python -c "
import onnxruntime as ort
session = ort.InferenceSession('models/best.onnx')
print('Providers:', session.get_providers())
import numpy as np
out = session.run(None, {'input': np.random.randn(1,3,640,640).astype(np.float32)})
print('Output shape:', out[0].shape)
"
```

---

## Security Checklist

- [ ] HTTPS enabled with valid certificates
- [ ] Strong `SECRET_KEY` (32+ random chars)
- [ ] `CORS_ORIGINS` restricted to known domains
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Non-root containers
- [ ] Model file integrity verified
- [ ] Regular dependency updates
- [ ] Audit logs enabled
- [ ] Backup strategy tested

---

## Support

- Documentation: https://docs.arabic-sign-language.ai
- Issues: GitHub Issues
- Email: support@arabic-sign-language.ai