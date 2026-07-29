# API Reference

## Base URL

```
Production: https://api.arabic-sign-language.ai/api/v1
Development: http://localhost:8000/api/v1
```

## Authentication

Currently, the API uses API key authentication for production. Development mode allows unauthenticated access.

```
Authorization: Bearer <api_key>
```

## Error Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error_code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {},
  "request_id": "uuid"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INFERENCE_ERROR` | 500 | Model inference failed |
| `MODEL_LOAD_ERROR` | 503 | Model not loaded |
| `UPLOAD_ERROR` | 400 | File upload failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error |

## Endpoints

### Health Check

#### GET /health

Check service health and model status.

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00Z",
  "status": "healthy",
  "version": "1.0.0",
  "model_loaded": true,
  "model_path": "models/best.onnx",
  "gpu_available": true,
  "cpu_usage": 15.2,
  "memory_usage": 45.8,
  "uptime_seconds": 3600.5,
  "execution_provider": "CUDAExecutionProvider",
  "load_time_ms": 1250.3,
  "warmup_time_ms": 45.2
}
```

---

### Inference

#### POST /predict/image

Run inference on an uploaded image.

**Request:**
- Content-Type: `multipart/form-data`
- `file`: Image file (PNG, JPEG, JPG, WEBP)
- `conf_threshold`: Optional, default 0.30
- `iou_threshold`: Optional, default 0.45
- `max_detections`: Optional, default 100

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00Z",
  "latency_ms": 8.5,
  "fps": 117.6,
  "predictions": [
    {
      "bbox": {"x1": 100.5, "y1": 150.2, "x2": 250.3, "y2": 300.8},
      "confidence": 0.95,
      "class_id": 0,
      "class_name": "ain"
    }
  ],
  "sentence": "ain",
  "provider": "CUDAExecutionProvider",
  "model_version": "1.0.0"
}
```

#### POST /predict/video

Process a video file with frame-by-frame detection.

**Request:**
- Content-Type: `multipart/form-data`
- `file`: Video file (MP4, AVI, MOV, MKV)
- `conf_threshold`: Optional, default 0.30
- `iou_threshold`: Optional, default 0.45
- `max_detections`: Optional, default 100
- `sample_rate`: Optional, default 1 (process every N frames)

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00Z",
  "video_info": {
    "total_frames": 900,
    "fps": 30.0,
    "width": 1920,
    "height": 1080,
    "duration_seconds": 30.0
  },
  "total_frames": 900,
  "processed_frames": 900,
  "predictions": [
    [
      {"bbox": [100, 150, 250, 300], "confidence": 0.95, "class_id": 0, "class_name": "ain"}
    ],
    [],
    [{"bbox": [120, 160, 270, 310], "confidence": 0.92, "class_id": 0, "class_name": "ain"}]
  ],
  "sentence": "ain al",
  "processing_time_ms": 45000.0,
  "download_url": "/api/v1/download/video/uuid"
}
```

#### POST /predict/camera

Process a single camera frame (base64 encoded).

**Request:**
```json
{
  "frame": "base64_encoded_jpeg",
  "conf_threshold": 0.30,
  "iou_threshold": 0.45,
  "max_detections": 100
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00.123Z",
  "latency_ms": 6.2,
  "fps": 161.3,
  "predictions": [
    {
      "bbox": {"x1": 100.5, "y1": 150.2, "x2": 250.3, "y2": 300.8},
      "confidence": 0.95,
      "class_id": 0,
      "class_name": "ain"
    }
  ],
  "sentence": "ain al"
}
```

---

### Sentence Builder

#### GET /sentence/state

Get current sentence builder state.

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00Z",
  "sentence": "ain al",
  "sentence_rtl": "‫ain al‬",
  "words": ["ain"],
  "current_word": "al",
  "total_letters": 5,
  "avg_confidence": 0.93,
  "can_undo": true,
  "can_redo": false
}
```

#### POST /sentence/add

Add a letter to the sentence.

**Request:**
```json
{
  "letter": "ain",
  "confidence": 0.95
}
```

**Response:** Returns updated state.

#### POST /sentence/space

Add a space (complete current word).

**Response:** Returns updated state.

#### POST /sentence/undo

Undo last action.

**Response:** Returns updated state.

#### POST /sentence/redo

Redo last undone action.

**Response:** Returns updated state.

#### POST /sentence/reset

Clear entire sentence.

**Response:** Returns empty state.

#### POST /sentence/export

Export sentence in specified format.

**Request:**
```json
{
  "format": "json"  // or "txt"
}
```

**Response:**
```json
{
  "success": true,
  "format": "json",
  "content": "{\"sentence\":\"ain al\",\"words\":[\"ain\"],...}",
  "filename": "sentence.json"
}
```

---

### History

#### GET /history

Get prediction history with pagination.

**Query Parameters:**
- `page`: Page number (default 1)
- `page_size`: Items per page (default 20, max 100)
- `source`: Filter by source (camera, image, video)

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00Z",
  "entries": [
    {
      "id": "uuid",
      "timestamp": "2026-01-15T10:25:00Z",
      "source": "camera",
      "source_name": "Live Camera",
      "detections": [...],
      "sentence": "ain al",
      "latency_ms": 8.5,
      "fps": 117.6,
      "avg_confidence": 0.93
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

#### GET /history/stats

Get history statistics.

**Response:**

```json
{
  "success": true,
  "total": 150,
  "by_source": {"camera": 80, "image": 50, "video": 20},
  "avg_latency": 7.8,
  "avg_fps": 125.3,
  "avg_confidence": 0.91
}
```

#### DELETE /history

Clear all history.

**Response:**

```json
{
  "success": true,
  "deleted_count": 150
}
```

#### DELETE /history/{entry_id}

Delete specific history entry.

**Response:**

```json
{
  "success": true
}
```

#### GET /history/export

Export history in specified format.

**Query Parameters:**
- `format`: json, csv, or txt (default json)

**Response:** File download

---

### Settings

#### GET /settings

Get current settings.

**Response:**

```json
{
  "success": true,
  "conf_threshold": 0.30,
  "iou_threshold": 0.45,
  "max_detections": 100,
  "bounding_box_color": "#00ff00",
  "label_color": "#ffffff",
  "font_size": 14,
  "show_fps": true,
  "show_latency": true,
  "show_confidence": true,
  "enable_sentence_builder": true,
  "language": "ar",
  "theme": "system"
}
```

#### PUT /settings

Update settings.

**Request:** (All fields optional)

```json
{
  "conf_threshold": 0.40,
  "theme": "dark"
}
```

**Response:** Returns updated settings.

---

### Metrics

#### GET /metrics

Get system and inference metrics (JSON).

**Response:**

```json
{
  "system": {
    "cpu_percent": 15.2,
    "memory_percent": 45.8,
    "memory_used_mb": 2048.5,
    "memory_total_mb": 4096.0,
    "disk_percent": 30.1,
    "disk_free_gb": 140.2,
    "uptime_seconds": 7200.5
  },
  "inference": {
    "total_inferences": 1500,
    "avg_preprocess_ms": 1.2,
    "avg_inference_ms": 3.8,
    "avg_nms_ms": 0.5,
    "avg_total_ms": 5.5,
    "avg_fps": 181.8,
    "errors": 2
  },
  "model": {
    "loaded": true,
    "execution_provider": "CUDAExecutionProvider",
    "load_time_ms": 1250.3,
    "warmup_time_ms": 45.2
  }
}
```

#### GET /metrics/prometheus

Get metrics in Prometheus format.

**Response:** Plain text with Prometheus metrics

---

## WebSocket (Future)

Real-time camera streaming endpoint (planned):

```
ws://localhost:8000/api/v1/ws/camera
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /predict/image | 30 req/min | 60s |
| /predict/video | 5 req/min | 60s |
| /predict/camera | 60 req/min | 60s |
| /sentence/* | 100 req/min | 60s |
| /history | 60 req/min | 60s |
| /settings | 30 req/min | 60s |
| /metrics | 10 req/min | 60s |
| /health | 120 req/min | 60s |

Headers returned:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Window`: Window in seconds
- `Retry-After`: Seconds until reset (on 429)

---

## File Upload Limits

| Type | Max Size | Formats |
|------|----------|---------|
| Images | 50 MB | PNG, JPEG, JPG, WEBP |
| Videos | 100 MB | MP4, AVI, MOV, MKV |

---

## Model Information

### Classes (32 Arabic Sign Language Letters)

| Index | Letter | Arabic | Index | Letter | Arabic |
|-------|--------|--------|-------|--------|--------|
| 0 | ain | ع | 16 | laam | ل |
| 1 | al | ال | 17 | meem | م |
| 2 | aleff | ا | 18 | nun | ن |
| 3 | bb | ب | 19 | ra | ر |
| 4 | dal | د | 20 | saad | ص |
| 5 | dha | ظ | 21 | seen | س |
| 6 | dhad | ض | 22 | sheen | ش |
| 7 | fa | ف | 23 | ta | ت |
| 8 | gaaf | ق | 24 | taa | ط |
| 9 | ghain | غ | 25 | thaa | ث |
| 10 | ha | ح | 26 | thal | ذ |
| 11 | haa | ه | 27 | toot | ء |
| 12 | jeem | ج | 28 | waw | و |
| 13 | kaaf | ك | 29 | ya | ي |
| 14 | khaa | خ | 30 | yaa | ى |
| 15 | la | لا | 31 | zay | ز |

### Performance Benchmarks

| Metric | GPU (CUDA) | CPU |
|--------|------------|-----|
| Load Time | ~1.2s | ~1.5s |
| Warmup (5 runs) | ~45ms | ~120ms |
| Preprocessing | ~0.2ms | ~0.5ms |
| Inference | ~3.8ms | ~45ms |
| NMS | ~0.5ms | ~2ms |
| **Total** | **~5ms** | **~48ms** |
| **FPS** | **~200** | **~20** |

---

## Example Usage

### cURL - Image Prediction

```bash
curl -X POST http://localhost:8000/api/v1/predict/image \
  -F "file=@test_image.jpg" \
  -F "conf_threshold=0.3" \
  -F "iou_threshold=0.45"
```

### cURL - Camera Frame

```bash
# Convert image to base64
BASE64=$(base64 -w 0 test_image.jpg)

curl -X POST http://localhost:8000/api/v1/predict/camera \
  -H "Content-Type: application/json" \
  -d "{\"frame\": \"$BASE64\", \"conf_threshold\": 0.3}"
```

### Python Client

```python
import requests
import base64

class ASLClient:
    def __init__(self, base_url="http://localhost:8000/api/v1"):
        self.base_url = base_url
    
    def predict_image(self, image_path, conf=0.3, iou=0.45):
        with open(image_path, 'rb') as f:
            files = {'file': f}
            data = {'conf_threshold': conf, 'iou_threshold': iou}
            response = requests.post(f"{self.base_url}/predict/image", files=files, data=data)
        return response.json()
    
    def predict_camera_frame(self, frame_bgr, conf=0.3):
        import cv2
        _, buffer = cv2.imencode('.jpg', frame_bgr)
        base64_frame = base64.b64encode(buffer).decode()
        response = requests.post(
            f"{self.base_url}/predict/camera",
            json={'frame': base64_frame, 'conf_threshold': conf}
        )
        return response.json()
    
    def get_sentence(self):
        return requests.get(f"{self.base_url}/sentence/state").json()
    
    def add_to_sentence(self, letter, confidence):
        return requests.post(
            f"{self.base_url}/sentence/add",
            json={'letter': letter, 'confidence': confidence}
        ).json()

# Usage
client = ASLClient()
result = client.predict_image("test.jpg")
print(f"Detected: {[p['class_name'] for p in result['predictions']]}")
```

### JavaScript/TypeScript Client

```typescript
interface Prediction {
  bbox: { x1: number; y1: number; x2: number; y2: number };
  confidence: number;
  class_id: number;
  class_name: string;
}

interface InferenceResult {
  success: boolean;
  latency_ms: number;
  fps: number;
  predictions: Prediction[];
  sentence: string;
}

class ASLClient {
  constructor(private baseUrl: string = 'http://localhost:8000/api/v1') {}
  
  async predictImage(file: File, conf = 0.3, iou = 0.45): Promise<InferenceResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conf_threshold', conf.toString());
    formData.append('iou_threshold', iou.toString());
    
    const response = await fetch(`${this.baseUrl}/predict/image`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }
  
  async predictCameraFrame(base64Frame: string, conf = 0.3): Promise<InferenceResult> {
    const response = await fetch(`${this.baseUrl}/predict/camera`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: base64Frame, conf_threshold: conf }),
    });
    return response.json();
  }
  
  async getSentenceState() {
    const response = await fetch(`${this.baseUrl}/sentence/state`);
    return response.json();
  }
}

// Usage
const client = new ASLClient();
const result = await client.predictImage(fileInput.files[0]);
console.log('Detected:', result.predictions.map(p => p.class_name));
```

---

## Changelog

### v1.0.0 (2026-01-15)
- Initial production release
- All endpoints documented above