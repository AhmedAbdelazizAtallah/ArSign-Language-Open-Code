# Troubleshooting Guide

## Quick Diagnostics

```bash
# Check all services
docker-compose ps

# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:3000

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Backend Issues

### 1. Model Not Loading

**Symptoms:**
- `/health` returns `"model_loaded": false`
- Logs show `FileNotFoundError` or `RuntimeError`

**Solutions:**
```bash
# Check model exists
ls -la models/best.onnx

# Verify permissions
chmod 644 models/best.onnx

# Check disk space
df -h

# Validate ONNX model
python -c "
import onnx
model = onnx.load('models/best.onnx')
onnx.checker.check_model(model)
print('Model valid')
print('Inputs:', [i.name for i in model.graph.input])
print('Outputs:', [o.name for o in model.graph.output])
"
```

### 2. GPU Not Detected

**Symptoms:**
- Logs show `CPUExecutionProvider` instead of `CUDAExecutionProvider`
- Inference slow (~50ms vs ~5ms)

**Solutions:**
```bash
# Check NVIDIA driver
nvidia-smi

# Check Docker GPU support
docker run --rm --gpus all nvidia/cuda:12.2-base nvidia-smi

# Install nvidia-container-toolkit
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add-
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify in container
docker-compose exec backend python -c "
import onnxruntime as ort
print('Providers:', ort.get_available_providers())
"
```

### 3. CORS Errors

**Symptoms:**
- Browser console: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Frontend can't connect to backend

**Solutions:**
```bash
# Check .env CORS_ORIGINS
cat .env | grep CORS

# Must match frontend URL exactly (including protocol)
CORS_ORIGINS=https://your-domain.com,http://localhost:3000

# For local HTTPS development
CORS_ORIGINS=https://localhost:3000,http://localhost:3000
```

### 4. High Latency / Low FPS

**Symptoms:**
- Camera feed lagging
- FPS < 30
- Latency > 100ms

**Solutions:**
```bash
# Check GPU usage
docker-compose exec backend nvidia-smi

# Reduce resolution in frontend (640x480 instead of 1280x720)
# Enable GPU if available
USE_GPU=true

# Check CPU throttling
docker stats asl-backend

# Increase workers
WORKERS=8

# Reduce inference frequency (frontend)
# targetFPS: 15 instead of 30
```

### 5. File Upload Fails

**Symptoms:**
- 400 Bad Request on upload
- 413 Payload Too Large

**Solutions:**
```bash
# Check max upload size
MAX_UPLOAD_SIZE=104857600  # 100MB

# Check file type
ALLOWED_IMAGE_TYPES=image/png,image/jpeg,image/jpg,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/avi,video/quicktime,video/x-matroska
```

---

## Frontend Issues

### 1. Camera Not Working

**Symptoms:**
- "Camera access denied"
- Black video feed
- No camera devices found

**Solutions:**
```bash
# Browser permissions
# Chrome: Settings > Privacy > Camera > Allow

# HTTPS required (except localhost)
# Use ngrok for testing: ngrok http 3000

# Check available cameras
docker-compose exec backend python -c "
import cv2
for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        print(f'Camera {i}: OK')
        cap.release()
    else:
        print(f'Camera {i}: Not available')
"
```

### 2. Hydration Errors

**Symptoms:**
- React console: "Hydration failed"
- UI flickers on load

**Solutions:**
```bash
# Check for client-only code in server components
# Use 'use client' directive
# Wrap in Suspense or use dynamic import

# Example fix:
'use client'
import dynamic from 'next/dynamic'
const CameraPage = dynamic(() => import('./camera/page'), { ssr: false })
```

### 3. Theme Not Switching

**Symptoms:**
- Dark/light toggle doesn't work
- Flash of wrong theme on load

**Solutions:**
```bash
# Check ThemeProvider setup
# Ensure 'use client' on providers.tsx
# Check next-themes configuration

# In providers.tsx:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
```

### 4. RTL Not Working for Arabic

**Symptoms:**
- Text left-aligned instead of right
- Punctuation in wrong position

**Solutions:**
```bash
# Check html dir attribute
# In layout.tsx:
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>

# Check font includes Arabic
# In globals.css:
@font-face {
  font-family: 'Noto Sans Arabic';
  src: url('https://fonts.gstatic.com/s/notosansarabic/v26/...');
}
```

---

## Docker Issues

### 1. Build Fails

**Solutions:**
```bash
# Clean build
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test .

# Check .dockerignore
cat .dockerignore
```

### 2. Container Exits Immediately

**Solutions:**
```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Model file missing
# - Port already in use
# - Permission denied
# - Import errors
```

### 3. Out of Memory

**Solutions:**
```bash
# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Or add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Render.com Issues

### 1. Deploy Fails

**Solutions:**
```bash
# Check build logs in Render dashboard
# Common issues:
# - Dockerfile path wrong
# - Build context wrong
# - Missing environment variables
# - Build timeout (increase in settings)
```

### 2. Service Won't Start

**Solutions:**
```bash
# Check start command matches Dockerfile CMD
# Check health check path (/health)
# Check port binding (0.0.0.0:8000)
# Check environment variables set
```

### 3. GPU Not Available

**Solutions:**
```bash
# Use GPU instance type in Render
# Set USE_GPU=true
# Check logs for CUDA detection
```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ModelLoadError: Model not found` | Model file missing | Check `models/best.onnx` exists |
| `InferenceError: CUDA out of memory` | GPU memory full | Reduce batch size, add swap |
| `ValidationError: File type not allowed` | Wrong file format | Check allowed MIME types |
| `Rate limit exceeded` | Too many requests | Wait or increase limit |
| `Connection refused` | Backend not running | Check `docker-compose ps` |
| `ModuleNotFoundError` | Missing dependency | `pip install -r requirements.txt` |
| `npm ERR! missing script` | Wrong directory | Run from `frontend/` |

---

## Getting Help

1. **Check logs first**: `docker-compose logs -f`
2. **Search existing issues**: GitHub Issues
3. **Create new issue** with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Docker version, GPU)
   - Relevant logs
4. **Contact**: support@arabic-sign-language.ai