# Architecture Overview

## System Architecture

The Arabic Sign Language Recognition Platform follows a **Feature-Based Architecture** combined with **Clean Architecture** principles, ensuring separation of concerns, maintainability, and scalability.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            USER INTERFACE                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    NEXT.JS 15 FRONTEND (React 19)                    │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │    │
│  │  │ Camera  │ │  Video  │ │ Image   │ │Dashboard│ │  Settings   │  │    │
│  │  │  Page   │ │  Page   │ │  Page   │ │  Page   │ │   Page      │  │    │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └──────┬──────┘  │    │
│  │       │           │           │           │              │          │    │
│  │       └───────────┴─────┬─────┴───────────┴──────────────┘          │    │
│  │                         │                                            │    │
│  │              ┌──────────▼──────────┐                                 │    │
│  │              │   STATE MANAGEMENT   │                                 │    │
│  │              │    (Zustand +        │                                 │    │
│  │              │   TanStack Query)    │                                 │    │
│  │              └──────────┬───────────┘                                 │    │
│  └─────────────────────────┼────────────────────────────────────────────┘    │
└────────────────────────────┼────────────────────────────────────────────────┘
                             │ REST API / WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (FastAPI)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      FASTAPI BACKEND (Python 3.14)                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │    │
│  │  │  Health  │ │ Inference│ │ Sentence │ │ History  │ │ Settings  │  │    │
│  │  │  Check   │ │  Routes  │ │  Routes  │ │  Routes  │ │  Routes   │  │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │    │
│  │       │            │            │            │             │          │    │
│  │       └────────────┼────────────┼────────────┼─────────────┘          │    │
│  │                    ▼            ▼            ▼                        │    │
│  │         ┌──────────────────────────────────────────────────┐         │    │
│  │         │              SERVICE LAYER                        │         │    │
│  │         │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │         │    │
│  │         │  │ Model    │ │Inference │ │ History  │ │Settings│        │    │
│  │         │  │ Service  │ │ Service  │ │ Service  │ │ Service│        │    │
│  │         │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘        │    │
│  │         └───────┼────────────┼────────────┼───────────┼────────────┘    │    │
│  └──────────────────┼────────────┼────────────┼───────────┼────────────────┘    │
└─────────────────────┼────────────┼────────────┼───────────┼────────────────────┘
                      ▼            ▼            ▼           ▼
         ┌──────────────────────────────────────────────────────────────┐
         │                    AI INFERENCE ENGINE                         │
         │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
         │  │Preprocess│ │ ONNX     │ │Postprocess│ │Temporal &       │  │
         │  │Pipeline  │ │Runtime   │ │ (NMS)    │ │Duplicate Filter │  │
         │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬────────┘  │
         └───────┼────────────┼────────────┼────────────────┼───────────┘
                 ▼            ▼            ▼                ▼
         ┌──────────────────────────────────────────────────────────────┐
         │                    MODEL LAYER                                 │
         │              best.onnx (YOLO26s, 32 classes)                  │
         └──────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Frontend (Next.js 15)
- **Pages**: Camera, Video, Image, Dashboard, Settings, History
- **Components**: Reusable UI components (Button, Card, Modal, etc.)
- **Features**: Feature-based modules with their own components, hooks, types
- **Hooks**: Custom React hooks for inference, sentence building, state
- **Services**: API client layer with TanStack Query for server state
- **Store**: Zustand for client state (settings, UI state)
- **Types**: TypeScript interfaces for all data structures

### Backend (FastAPI)
- **API Layer**: REST endpoints with request/response validation
- **Services**: Business logic (Model, Inference, History, Settings)
- **Models**: Pydantic domain models
- **Schemas**: Request/Response DTOs
- **Inference**: Pipeline orchestration
- **Preprocessing**: Image/video preprocessing matching Ultralytics
- **Postprocessing**: NMS, coordinate transformation
- **Middleware**: CORS, timing, request ID, logging, security headers
- **Logging**: Structured JSON logging with structlog

### AI Module (Independent)
- **Model Loader**: ONNX session management, provider selection, warmup
- **Inference Engine**: High-performance inference with batching
- **Preprocessing**: Letterbox resize, normalization, tensor conversion
- **NMS**: Optimized non-maximum suppression
- **Temporal Stabilizer**: Sliding window majority voting
- **Duplicate Filter**: Cooldown-based duplicate suppression
- **Sentence Builder**: RTL Arabic text construction with undo/redo

## Data Flow

### Image Inference
```
User Upload Image
       │
       ▼
Frontend: File validation → Base64 encoding
       │
       ▼
POST /api/v1/predict/image
       │
       ▼
Backend: Request validation → Preprocessing → ONNX Inference
       │                                                    │
       ▼                                                    ▼
Letterbox Resize (640x640)                    Raw Predictions
       │                                                    │
       ▼                                                    ▼
Normalize (0-1) → CHW → Batch                    NMS (conf=0.3, IoU=0.45)
       │                                                    │
       ▼                                                    ▼
ONNX Runtime (CUDA/CPU)                    Filtered Detections
       │                                                    │
       ▼                                                    ▼
Raw Output (1, 8400, 37)                 Coordinate Transform
       │                                                    │
       └──────────────────────┬─────────────────────────────┘
                              ▼
                     JSON Response
                     (detections, latency, fps)
                              │
                              ▼
Frontend: Update UI → Draw boxes → Update Sentence Builder
```

### Video Inference
```
Upload Video → Save temp file → Frame extraction (sample_rate)
                              │
                              ▼
                    For each frame:
                    Preprocess → Inference → NMS → Stabilize → Filter
                              │
                              ▼
                    Aggregate predictions
                              │
                              ▼
                    Build sentence
                              │
                              ▼
                    Return results + download URL
```

### Camera Streaming
```
getUserMedia → Video Element → RequestAnimationFrame
                              │
                              ▼
                    Capture frame → Base64 encode
                              │
                              ▼
                    POST /api/v1/predict/camera
                              │
                              ▼
                    Backend inference pipeline
                              │
                              ▼
                    Return detections
                              │
                              ▼
Frontend: Draw overlay → Update sentence → Next frame
```

## Technology Decisions

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend Framework | Next.js 15 (App Router) | React 19, Server Components, optimal performance |
| Language | TypeScript 5 | Type safety, developer experience |
| Styling | Tailwind CSS v4 | Utility-first, fast builds, dark mode |
| UI Components | shadcn/ui + Radix | Accessible, customizable, headless |
| State | Zustand + TanStack Query | Lightweight client state, powerful server state |
| Animation | Framer Motion | Declarative, performant animations |
| i18n | next-intl | Server-side i18n, RTL support |
| Backend Framework | FastAPI | Async, automatic OpenAPI, Pydantic v2 |
| Inference | ONNX Runtime | Cross-platform, GPU acceleration, optimized |
| Image Processing | OpenCV (cv2) | Fast, matches Ultralytics preprocessing |
| Logging | structlog | Structured JSON logging, context binding |
| Validation | Pydantic v2 | Fast, type-safe validation |
| Containerization | Docker multi-stage | Small images, build caching |
| Deployment | Render.com | Managed infrastructure, auto-deploy |
| CI/CD | GitHub Actions | Native GitHub integration |

## Scalability Considerations

1. **Stateless Backend**: Horizontal scaling via multiple replicas
2. **Model Loading**: Single model load per process, shared session
3. **Async Processing**: FastAPI async endpoints for I/O operations
3. **Caching**: TanStack Query for frontend, Redis for backend (future)
4. **Database**: PostgreSQL for history persistence (future)
5. **Message Queue**: Celery/RQ for long-running video processing (future)
6. **Monitoring**: Prometheus metrics, structured logging

## Security Measures

- Input validation on all endpoints
- File type/size validation
- CORS configuration
- Security headers (CSP, HSTS, etc.)
- Rate limiting
- Non-root Docker containers
- Secrets via environment variables
- No sensitive data in logs

## Performance Targets

| Metric | Target |
|--------|--------|
| Model Load Time | < 5 seconds |
| Warmup Time | < 2 seconds |
| Image Preprocessing | < 2ms |
| Inference (GPU) | < 5ms |
| Inference (CPU) | < 50ms |
| NMS Postprocessing | < 2ms |
| End-to-End Latency | < 20ms |
| Frontend FPS | 60 FPS |
| API Response (p99) | < 100ms |