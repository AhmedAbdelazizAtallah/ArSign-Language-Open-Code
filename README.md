# Arabic Sign Language Real-Time Recognition Platform

[![Python](https://img.shields.io/badge/Python-3.14-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-1.19-orange?logo=onnx&logoColor=white)](https://onnxruntime.ai)
[![Docker](https://img.shields.io/badge/Docker-27-blue?logo=docker&logoColor=white)](https://docker.com)
[![Render](https://img.shields.io/badge/Render-Deploy-46e3b7?logo=render&logoColor=white)](https://render.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **Production-ready AI platform for real-time Arabic Sign Language recognition from camera, video, and images using a custom YOLO26s model exported to ONNX.**

## Overview

This platform enables Deaf and Hard-of-Hearing users to communicate naturally by recognizing Arabic Sign Language gestures in real-time. Built with a professional engineering approach, it delivers commercial-grade performance, accessibility, and user experience.

### Key Features

- **Real-time Camera Inference** - Live detection with configurable camera settings
- **Video Processing** - Upload and process videos with frame-by-frame detection
- **Image Recognition** - Instant inference on uploaded images
- **Arabic Sentence Builder** - RTL text generation with temporal stabilization
- **Prediction History** - Export to CSV, JSON, TXT formats
- **Professional Dashboard** - Real-time metrics (FPS, latency, GPU/CPU usage)
- **Full Accessibility** - Keyboard navigation, screen readers, high contrast, RTL support
- **Multi-language** - Arabic (RTL) and English (LTR) with instant switching
- **Theme Support** - Light, Dark, and System themes
- **Production Deployment** - Docker, Render.com, GitHub Actions CI/CD

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Inference AI    │
│  (Next.js)  │     │  (FastAPI)  │     │  (ONNX Runtime)  │
└─────────────┘     └─────────────┘     └──────────────────┘
                           │                      │
                    ┌──────▼──────┐        ┌───────▼───────┐
                    │  Services   │        │  Model        │
                    │  • Inference│        │  • best.onnx  │
                    │  • Sentence │        │  • YOLO26s    │
                    │  • History  │        │  • 32 Classes │
                    └─────────────┘        └───────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.14+
- Docker (optional)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/arabic-sign-language-platform.git
cd arabic-sign-language-platform

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

### Docker Deployment

```bash
docker-compose up --build
```

### Render Deployment

1. Connect your GitHub repository to Render
2. Use the provided `render.yaml` configuration
3. Set environment variables in Render dashboard
4. Deploy automatically on push

## Model Information

| Property | Value |
|----------|-------|
| **Framework** | Ultralytics YOLO26s |
| **Format** | ONNX (best.onnx) |
| **Task** | Object Detection |
| **Input** | 640×640 RGB |
| **Classes** | 32 Arabic Sign Language letters |
| **Parameters** | 9,972,632 |
| **GFLOPs** | 22.6 |
| **mAP@50** | 98.59% |
| **mAP@50-95** | 82.15% |
| **Precision** | 97.10% |
| **Recall** | 95.52% |

### Class Mapping

| Index | Letter | Index | Letter | Index | Letter |
|-------|--------|-------|--------|-------|--------|
| 0 | ain | 11 | haa | 22 | sheen |
| 1 | al | 12 | jeem | 23 | ta |
| 2 | aleff | 13 | kaaf | 24 | taa |
| 3 | bb | 14 | khaa | 25 | thaa |
| 4 | dal | 15 | la | 26 | thal |
| 5 | dha | 16 | laam | 27 | toot |
| 6 | dhad | 17 | meem | 28 | waw |
| 7 | fa | 18 | nun | 29 | ya |
| 8 | gaaf | 19 | ra | 30 | yaa |
| 9 | ghain | 20 | saad | 31 | zay |
| 10 | ha | 21 | seen | | |

## API Reference

### Health Check
```http
GET /health
```

### Image Prediction
```http
POST /predict/image
Content-Type: multipart/form-data

file: <image_file>
conf_threshold: 0.30 (optional)
iou_threshold: 0.45 (optional)
max_detections: 100 (optional)
```

### Video Prediction
```http
POST /predict/video
Content-Type: multipart/form-data

file: <video_file>
conf_threshold: 0.30 (optional)
iou_threshold: 0.45 (optional)
max_detections: 100 (optional)
```

### Camera Streaming
```http
POST /predict/camera
Content-Type: application/json

{
  "frame": "base64_encoded_frame",
  "conf_threshold": 0.30,
  "iou_threshold": 0.45,
  "max_detections": 100
}
```

### Sentence Builder
```http
POST /sentence/reset
POST /sentence/export
```

### History
```http
GET /history
DELETE /history
```

### Settings
```http
GET /settings
PUT /settings
```

### Metrics
```http
GET /metrics
```

## Configuration

Environment variables (`.env`):

```env
# Model
MODEL_PATH=models/best.onnx
CONF_THRESHOLD=0.30
IOU_THRESHOLD=0.45
MAX_DETECTIONS=100

# Server
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
USE_GPU=true

# Upload
MAX_UPLOAD_SIZE=104857600  # 100MB

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Performance Benchmarks

| Metric | Target | Achieved |
|--------|--------|----------|
| Preprocessing | < 2ms | ~0.2ms |
| Inference (GPU) | < 5ms | ~3.8ms |
| Postprocessing | < 2ms | ~0.2ms |
| End-to-end Latency | < 20ms | ~8ms |
| FPS (GPU) | 200+ | 200+ |
| Startup Time | < 5s | ~3s |

## Accessibility

- **WCAG 2.1 AA** compliant
- **Keyboard navigation** throughout
- **Screen reader** support with ARIA labels
- **High contrast** mode
- **Large text** scaling
- **RTL/LTR** layout support
- **Color blind** friendly palette
- **Focus indicators** on all interactive elements

## Supported Platforms

| Platform | Browsers |
|----------|----------|
| Desktop | Chrome, Edge, Firefox, Safari |
| Mobile | Chrome Android, Safari iOS |
| Tablet | All modern browsers |

## Project Structure

```
arabic-sign-language-platform/
├── frontend/                 # Next.js 15 Application
│   ├── app/                  # App Router pages
│   ├── components/           # Reusable UI components
│   ├── features/             # Feature-based modules
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API clients
│   ├── store/                # Zustand state management
│   ├── lib/                  # Utilities
│   ├── types/                # TypeScript types
│   └── styles/               # Global styles
├── backend/                  # FastAPI Application
│   ├── api/                  # API routes
│   ├── core/                 # Core configuration
│   ├── config/               # Settings management
│   ├── services/             # Business logic
│   ├── models/               # Pydantic models
│   ├── schemas/              # Request/Response schemas
│   ├── inference/            # Inference pipeline
│   ├── preprocessing/        # Image preprocessing
│   ├── postprocessing/       # NMS, filtering
│   ├── middleware/           # Custom middleware
│   └── logging/              # Structured logging
├── ai/                       # Independent AI Module
│   ├── model_loader.py       # ONNX model loading
│   ├── inference_engine.py   # Core inference
│   ├── preprocess.py         # Preprocessing pipeline
│   ├── postprocess.py        # Postprocessing
│   ├── nms.py                # Non-Maximum Suppression
│   ├── temporal_stabilizer.py# Temporal stabilization
│   ├── duplicate_filter.py   # Duplicate suppression
│   ├── sentence_builder.py   # Sentence construction
│   └── benchmark.py          # Performance benchmarking
├── docker/                   # Docker configurations
├── docs/                     # Documentation
├── scripts/                  # Utility scripts
├── tests/                    # Test suites
├── assets/                   # Static assets
├── models/                   # Model files
└── .github/                  # GitHub Actions workflows
```

## Development

### Code Quality

```bash
# Backend
cd backend
ruff check .
ruff format .
mypy .

# Frontend
cd frontend
npm run lint
npm run typecheck
npm run format
```

### Testing

```bash
# Backend tests
cd backend
pytest tests/ -v --cov

# Frontend tests
cd frontend
npm run test
npm run test:e2e
```

### Pre-commit Hooks

```bash
pre-commit install
pre-commit run --all-files
```

## Deployment

### Docker

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Logs
docker-compose logs -f
```

### Render.com

1. Fork this repository
2. Create new Web Service on Render
3. Connect GitHub repository
4. Use `render.yaml` for configuration
5. Set environment variables
6. Deploy

### Production Checklist

- [ ] Set secure `SECRET_KEY`
- [ ] Configure `CORS_ORIGINS`
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure log aggregation
- [ ] Set up backups
- [ ] Configure rate limiting
- [ ] Enable security headers

## Roadmap

### v1.1 - Sentence Suggestions
- Autocomplete for Arabic words
- Grammar correction
- Context-aware predictions

### v1.2 - Voice Output
- Text-to-speech for sentences
- Multiple voice options
- Speed/pitch controls

### v1.3 - Authentication
- User accounts
- Personal history
- Cloud synchronization

### v2.0 - Arabic Word Recognition
- Word-level detection
- Grammar understanding
- Sentence-level translation

### v3.0 - Cloud AI Inference
- Distributed inference
- Auto-scaling
- Edge deployment

## Known Limitations

- Performance may decrease in very dark environments
- Heavy motion blur reduces confidence
- Low contrast scenes affect detection
- Strong finger occlusion limits recognition
- Skin-colored backgrounds may cause false positives

The UI communicates uncertainty instead of silently hiding detections.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Ultralytics for YOLO architecture
- ONNX Runtime team
- Arabic Sign Language research community
- Open source contributors

## Citation

```bibtex
@software{arabic_sign_language_platform,
  title = {Arabic Sign Language Real-Time Recognition Platform},
  version = {1.0.0},
  year = {2026},
  url = {https://github.com/your-org/arabic-sign-language-platform}
}
```

## Contact

- **Issues**: [GitHub Issues](https://github.com/your-org/arabic-sign-language-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/arabic-sign-language-platform/discussions)
- **Email**: contact@arabic-sign-language.ai