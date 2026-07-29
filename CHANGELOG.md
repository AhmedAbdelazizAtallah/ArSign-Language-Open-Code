# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-30

### Added
- **Complete Production-Ready Platform** for Arabic Sign Language Recognition
- **AI Inference Engine** with YOLO26s + ONNX Runtime
  - Model loader with automatic GPU/CPU provider selection
  - Ultralytics-compatible preprocessing (letterbox, normalization, CHW)
  - Optimized Non-Maximum Suppression (configurable conf/IoU/max detections)
  - Temporal Stabilization (sliding window majority voting, confidence smoothing)
  - Duplicate Filter (cooldown, letter lock, state machine)
  - Arabic Sentence Builder (RTL, undo/redo, export JSON/TXT)
  - Benchmarking utilities
- **FastAPI Backend** (Python 3.14)
  - REST API with full OpenAPI documentation
  - Health checks, metrics, logging, rate limiting
  - Image prediction endpoint
  - Video processing endpoint (frame-by-frame)
  - Camera frame streaming endpoint (base64)
  - Sentence builder API
  - History management with pagination and export
  - Settings management with persistence
  - Structured JSON logging with request IDs
  - Security headers, CORS, rate limiting
- **Next.js 15 Frontend** (React 19, TypeScript)
  - Camera page (live preview, detections overlay, sentence builder)
  - Video page (upload, processing, timeline, export)
  - Image page (upload, zoom/pan, detections, export)
  - Dashboard (real-time metrics, model status, quick actions)
  - Settings (inference, UI, general, advanced, data)
  - History (pagination, filters, export, delete)
  - Accessibility (WCAG 2.1 AA, RTL, keyboard, screen readers)
  - Theme support (light/dark/system)
  - i18n (Arabic/English with instant switching)
  - Responsive design (320px - 4K)
- **Deployment & DevOps**
  - Multi-stage Dockerfiles (backend + frontend)
  - Docker Compose with GPU support
  - Render.com deployment config
  - GitHub Actions CI/CD (lint, test, security, build, deploy)
  - Dependabot configuration
  - Pre-commit hooks
- **Documentation**
  - Comprehensive README with badges
  - Architecture documentation
  - Deployment guide
  - API reference
  - Performance guide
  - Testing guide
  - Troubleshooting guide
  - Contributing guide
  - Security policy
  - Code of conduct
  - Changelog

### Performance
- **GPU Inference**: ~4.5ms total (0.2ms preprocess + 3.8ms inference + 0.5ms NMS)
- **CPU Inference**: ~47.5ms total
- **Target FPS**: 200+ (GPU), 20+ (CPU)
- **Model**: YOLO26s, 32 classes, 98.59% mAP@50

### Security
- Input validation on all endpoints
- File type/size validation
- Rate limiting
- Security headers (CSP, HSTS, etc.)
- Non-root Docker containers
- Secret management via environment variables
- Dependency scanning in CI/CD

## [Unreleased]

### Planned for v1.1
- Sentence suggestions/autocomplete
- Grammar correction for Arabic
- Context-aware predictions

### Planned for v1.2
- Text-to-speech voice output
- Multiple voice options
- Speed/pitch controls

### Planned for v1.3
- User authentication
- Personal history
- Cloud synchronization

### Planned for v2.0
- Arabic word recognition
- Grammar understanding
- Sentence-level translation

### Planned for v3.0
- Cloud AI inference
- Distributed processing
- Auto-scaling
- Edge deployment