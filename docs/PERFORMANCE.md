# Performance Guide

## Benchmarks

### Model Performance (YOLO26s)

| Metric | Value |
|--------|-------|
| Parameters | 9,972,632 |
| GFLOPs | 22.6 |
| mAP@50 | 98.59% |
| mAP@50-95 | 82.15% |
| Precision | 97.10% |
| Recall | 95.52% |

### Inference Latency (640×640 input)

| Stage | GPU (ms) | CPU (ms) |
|-------|----------|----------|
| Preprocessing | 0.2 | 0.5 |
| Inference | 3.8 | 45 |
| NMS | 0.5 | 2.0 |
| **Total** | **4.5** | **47.5** |
| **FPS** | **222** | **21** |

### End-to-End API Latency

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| /predict/image | 8ms | 15ms | 25ms |
| /predict/camera | 6ms | 12ms | 20ms |
| /predict/video | N/A | N/A | N/A |

---

## Optimization Guide

### Backend Optimization

#### 1. Model Loading
```python
# Load once at startup (already implemented)
session = ort.InferenceSession(
    model_path,
    sess_options=SessionOptions(graph_optimization_level=ORT_ENABLE_ALL),
    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
)
```

#### 2. Threading Configuration
```env
# For CPU inference
INTRA_OP_THREADS=4
INTER_OP_THREADS=2

# For GPU inference
INTRA_OP_THREADS=1
INTER_OP_THREADS=1
```

#### 3. Batch Processing
```python
# Process multiple frames at once
def infer_batch(images: List[np.ndarray]) -> List[Detections]:
    batch = np.stack([preprocess(img) for img in images])
    outputs = session.run(output_names, {input_name: batch})
    return [postprocess(out) for out in outputs]
```

#### 4. Memory Reuse
```python
# Reuse preallocated buffers
class InferenceEngine:
    def __init__(self):
        self._input_buffer = np.empty((1, 3, 640, 640), dtype=np.float32)
        self._output_buffers = []
    
    def infer(self, image):
        preprocess_into(image, self._input_buffer)
        outputs = session.run(..., {input_name: self._input_buffer})
        return postprocess(outputs)
```

### Frontend Optimization

#### 1. Code Splitting
```typescript
// Lazy load heavy pages
const CameraPage = lazy(() => import('./camera/page'));
const VideoPage = lazy(() => import('./video/page'));
const DashboardPage = lazy(() => import('./dashboard/page'));
```

#### 2. Virtualization
```tsx
// For long history lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={entries.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <HistoryEntry entry={entries[index]} />
    </div>
  )}
</FixedSizeList>
```

#### 3. Image Optimization
```tsx
// Next.js Image component
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Prediction"
  width={640}
  height={640}
  priority={isFirstImage}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

#### 4. Memoization
```tsx
// Prevent unnecessary re-renders
const DetectionBox = memo(({ detection, color }) => (
  <div style={boxStyle} className="detection-box" />
), (prev, next) => 
  prev.detection.bbox === next.detection.bbox &&
  prev.detection.confidence === next.detection.confidence
);
```

---

## Scaling Strategies

### Horizontal Scaling (Backend)

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
  
# Add load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

```nginx
# nginx.conf
upstream backend {
    least_conn;
    server backend_1:8000;
    server backend_2:8000;
    server backend_3:8000;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

### Async Processing (Video)

```python
# Use Celery for long-running tasks
from celery import Celery

celery = Celery('asl', broker='redis://localhost:6379')

@celery.task
def process_video_task(video_path, options):
    results = inference_service.infer_video(video_path, **options)
    # Save to database, notify user
    return results
```

### Caching

```python
# Redis cache for frequent predictions
import redis
import hashlib

cache = redis.Redis(decode_responses=True)

def get_cached_prediction(image_hash):
    cached = cache.get(f"pred:{image_hash}")
    if cached:
        return json.loads(cached)
    return None

def set_cached_prediction(image_hash, result, ttl=3600):
    cache.setex(f"pred:{image_hash}", ttl, json.dumps(result))
```

---

## Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Latency (p95) | < 20ms | > 50ms |
| Inference FPS | > 150 | < 50 |
| GPU Utilization | 60-80% | < 20% or > 95% |
| Memory Usage | < 2GB | > 3GB |
| Error Rate | < 0.1% | > 1% |

### Grafana Dashboards

Import dashboard ID: `1860` (Node Exporter) + custom ASL dashboard

### Prometheus Metrics

```python
# Custom metrics
from prometheus_client import Counter, Histogram, Gauge

INFERENCE_COUNT = Counter('asl_inferences_total', 'Total inferences')
INFERENCE_LATENCY = Histogram('asl_inference_latency_seconds', 'Inference latency')
INFERENCE_FPS = Gauge('asl_fps', 'Current FPS')
GPU_USAGE = Gauge('asl_gpu_usage_percent', 'GPU utilization')
MODEL_LOADED = Gauge('asl_model_loaded', 'Model loaded status')

# In inference code:
INFERENCE_COUNT.inc()
with INFERENCE_LATENCY.time():
    result = engine.infer(image)
INFERENCE_FPS.set(1000 / result.total_ms)
```

---

## Performance Tuning Checklist

- [ ] Model loaded once at startup
- [ ] GPU acceleration enabled (CUDA/TensorRT)
- [ ] Batch processing for video frames
- [ ] Memory buffers reused
- [ ] Threading optimized for hardware
- [ ] Frontend code splitting implemented
- [ ] Virtualization for long lists
- [ ] Images optimized with Next.js Image
- [ ] Components memoized
- [ ] Horizontal scaling configured
- [ ] Async processing for videos
- [ ] Redis caching enabled
- [ ] Prometheus metrics exposed
- [ ] Alerts configured
- [ ] Load testing completed

---

## Debugging Performance

```bash
# Check GPU usage
nvidia-smi -l 1

# Profile Python
python -m cProfile -o profile.stats backend/main.py
snakeviz profile.stats

# Check memory
docker stats asl-backend

# Profile ONNX Runtime
export ORT_LOGGING_LEVEL=3
export ORT_LOGGING_VERBOSITY=3

# Frontend profiling
# Chrome DevTools > Performance tab
# React DevTools > Profiler
```