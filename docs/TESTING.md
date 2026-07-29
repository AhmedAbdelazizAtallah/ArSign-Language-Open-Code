# Testing Guide

## Overview

This guide covers the testing strategy for the Arabic Sign Language Platform, including unit tests, integration tests, end-to-end tests, and performance tests.

## Test Structure

```
tests/
├── test_ai_pipeline.py      # AI inference pipeline tests
├── test_backend.py          # Backend API tests
├── frontend/                # Frontend tests
│   ├── unit/                # Component unit tests
│   ├── integration/         # Feature integration tests
│   └── e2e/                 # End-to-end tests
└── conftest.py              # Pytest configuration
```

---

## Backend Testing

### Running Tests

```bash
cd backend

# All tests with coverage
pytest tests/ -v --cov=backend --cov-report=html

# Specific test file
pytest tests/test_inference.py -v

# With markers
pytest tests/ -m "not slow" -v

# Parallel execution
pytest tests/ -n auto
```

### Test Categories

#### Unit Tests
Test individual functions and classes in isolation.

```python
# tests/test_preprocessing.py
import pytest
import numpy as np
from ai.preprocess import Preprocessor, LetterboxResize

class TestLetterboxResize:
    def test_square_image(self):
        letterbox = LetterboxResize(new_shape=(640, 640))
        image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        result, ratio, (dw, dh) = letterbox(image)
        
        assert result.shape == (640, 640, 3)
        assert ratio == (1.0, 1.0)
        assert dw == 0 and dh == 0
    
    def test_landscape_image(self):
        letterbox = LetterboxResize(new_shape=(640, 640))
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        result, ratio, (dw, dh) = letterbox(image)
        
        assert result.shape == (640, 640, 3)
        assert ratio[0] == ratio[1]
        assert dh > 0  # padding on top/bottom

class TestPreprocessor:
    def test_preprocess_numpy(self):
        preprocessor = Preprocessor()
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        tensor = preprocessor.preprocess(image)
        
        assert tensor.shape == (1, 3, 640, 640)
        assert tensor.dtype == np.float32
    
    def test_preprocess_with_meta(self):
        preprocessor = Preprocessor()
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        tensor, meta = preprocessor.preprocess(image, return_meta=True)
        
        assert 'original_shape' in meta
        assert meta['original_shape'] == (480, 640)
```

#### Integration Tests
Test API endpoints with real services.

```python
# tests/test_backend.py
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.services.inference_service import InferenceService
from unittest.mock import Mock, AsyncMock

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

@pytest.fixture
def mock_inference_service():
    service = Mock(spec=InferenceService)
    service.infer_image = Mock(return_value=InferenceResult(
        detections=[...],
        preprocess_ms=1.5,
        inference_ms=3.2,
        nms_ms=0.5,
        total_ms=5.2,
        fps=192.3,
        provider='CPUExecutionProvider'
    ))
    return service

def test_predict_image(client, mock_inference_service):
    with patch('backend.api.v1.predict.get_inference_service', 
               return_value=mock_inference_service):
        response = client.post(
            '/api/v1/predict/image',
            files={'file': ('test.jpg', b'fake image data', 'image/jpeg')}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert 'predictions' in data
    assert 'latency_ms' in data
```

#### Model Loading Tests

```python
# tests/test_model_service.py
import pytest
import onnxruntime as ort
from backend.services.model_service import ModelService
from backend.core.exceptions import ModelLoadError

class TestModelService:
    @pytest.mark.asyncio
    async def test_load_model_success(self):
        service = ModelService()
        service.settings.model_path = "models/best.onnx"
        
        session = await service.load()
        
        assert isinstance(session, ort.InferenceSession)
        assert service.is_loaded is True
    
    @pytest.mark.asyncio
    async def test_load_model_not_found(self):
        service = ModelService()
        service.settings.model_path = "nonexistent.onnx"
        
        with pytest.raises(ModelLoadError):
            await service.load()
    
    @pytest.mark.asyncio
    async def test_warmup(self):
        service = ModelService()
        service.settings.model_path = "models/best.onnx"
        await service.load()
        
        stats = await service.warmup(runs=3)
        
        assert stats['runs'] == 3
        assert stats['avg_ms'] > 0
        assert stats['min_ms'] <= stats['avg_ms'] <= stats['max_ms']
```

---

## Frontend Testing

### Running Tests

```bash
cd frontend

# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test -- --coverage

# E2E tests
npm run test:e2e
```

### Component Tests

```tsx
// frontend/features/camera/__tests__/CameraView.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraView } from '../CameraView';
import { useInference } from '@/hooks/useInference';

jest.mock('@/hooks/useInference');

describe('CameraView', () => {
  const mockInference = {
    inferCameraFrame: jest.fn(),
    isLoading: false,
    isCameraLoading: false,
  };

  beforeEach(() => {
    (useInference as jest.Mock).mockReturnValue(mockInference);
  });

  it('renders upload area when camera inactive', () => {
    render(<CameraView />);
    
    expect(screen.getByText('Camera Inactive')).toBeInTheDocument();
    expect(screen.getByText('Start Camera')).toBeInTheDocument();
  });

  it('shows loading state during camera start', async () => {
    mockInference.isCameraLoading = true;
    render(<CameraView />);
    
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });
});

// Sentence Builder Tests
// frontend/features/sentence/__tests__/SentenceBuilder.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SentenceBuilder } from '../SentenceBuilder';
import { useSentence } from '@/hooks/useSentence';

jest.mock('@/hooks/useSentence');

describe('SentenceBuilder', () => {
  const mockSentence = {
    localSentence: 'ain al',
    localWords: ['ain'],
    localCurrentWord: 'al',
    addLetter: jest.fn(),
    addSpace: jest.fn(),
    undo: jest.fn(),
    clear: jest.fn(),
    canUndo: true,
    canRedo: false,
  };

  beforeEach(() => {
    (useSentence as jest.Mock).mockReturnValue(mockSentence);
  });

  it('displays RTL sentence', () => {
    render(<SentenceBuilder />);
    
    expect(screen.getByText('ain al')).toBeInTheDocument();
    expect(screen.getByText('al')).toHaveStyle({ direction: 'rtl' });
  });

  it('calls addLetter on button click', () => {
    render(<SentenceBuilder />);
    
    fireEvent.click(screen.getByText('ain'));
    
    expect(mockSentence.addLetter).toHaveBeenCalledWith('ain', expect.any(Number));
  });

  it('shows undo button when available', () => {
    render(<SentenceBuilder />);
    
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
  });
});
```

### Hook Tests

```tsx
// frontend/hooks/__tests__/useInference.test.ts
import { renderHook, act } from '@testing-library/react';
import { useInference } from '../useInference';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('useInference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state during inference', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      success: true,
      predictions: [],
      latency_ms: 10,
      fps: 100,
    });

    const { result } = renderHook(() => useInference());

    await act(async () => {
      await result.current.inferCameraFrame('base64frame');
    });

    expect(result.current.isLoading).toBe(false);
    expect(api.post).toHaveBeenCalledWith('/predict/camera', expect.any(Object));
  });

  it('handles inference errors', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useInference());

    await act(async () => {
      try {
        await result.current.inferCameraFrame('base64frame');
      } catch (e) {}
    });

    expect(result.current.error).toBe('Network error');
  });
});
```

### E2E Tests (Playwright)

```ts
// frontend/e2e/camera.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Camera Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/camera');
  });

  test('should start camera and show detections', async ({ page }) => {
    // Mock getUserMedia
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: () => {} }],
      });
    });

    await page.click('button:has-text("Start Camera")');
    
    // Wait for camera to start
    await expect(page.locator('text=Starting...')).toBeVisible();
    await expect(page.locator('video')).toBeVisible();
  });

  test('should display sentence builder', async ({ page }) => {
    await expect(page.locator('[dir="rtl"]')).toBeVisible();
    await expect(page.locator('text=Sentence Builder')).toBeVisible();
  });
});

// frontend/e2e/image.spec.ts
test.describe('Image Page', () => {
  test('should upload and analyze image', async ({ page }) => {
    await page.goto('/image');
    
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test/fixtures/test-image.jpg');
    
    // Click analyze
    await page.click('button:has-text("Analyze Image")');
    
    // Wait for results
    await expect(page.locator('text=Detections')).toBeVisible({ timeout: 10000 });
    
    // Check detections displayed
    await expect(page.locator('[class*="detection"]')).toHaveCount.greaterThan(0);
  });
});
```

---

## AI Pipeline Testing

### Benchmark Tests

```python
# tests/test_benchmark.py
import pytest
import numpy as np
import time
from ai.benchmark import BenchmarkRunner
from ai.inference_engine import get_inference_engine

class TestBenchmark:
    @pytest.fixture(scope="class")
    def engine(self):
        engine = get_inference_engine()
        engine.initialize()
        return engine

    @pytest.fixture
    def test_image(self):
        return np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

    def test_benchmark_runs(self, engine, test_image):
        runner = BenchmarkRunner()
        result = runner.run(test_image, warmup_runs=5, benchmark_runs=50)
        
        assert result.total_runs == 50
        assert result.avg_total_ms > 0
        assert result.fps > 0
        assert result.avg_preprocess_ms < 5  # Should be < 5ms
        assert result.avg_inference_ms < 100  # Depends on CPU/GPU

    def test_performance_targets(self, engine, test_image):
        """Test that performance meets targets."""
        runner = BenchmarkRunner()
        result = runner.run(test_image, warmup_runs=5, benchmark_runs=100)
        
        # Targets (adjust based on hardware)
        assert result.avg_preprocess_ms < 2.0
        assert result.avg_inference_ms < 50.0  # CPU fallback
        assert result.avg_nms_ms < 2.0
        assert result.fps > 20  # Minimum acceptable FPS
```

### Accuracy Tests

```python
# tests/test_accuracy.py
import pytest
import numpy as np
from ai.inference_engine import get_inference_engine

class TestAccuracy:
    @pytest.fixture(scope="class")
    def engine(self):
        engine = get_inference_engine()
        engine.initialize()
        return engine

    def test_known_image_detection(self, engine):
        """Test detection on known test images."""
        # Load test image with known ground truth
        test_cases = [
            ("tests/fixtures/ain_clear.jpg", "ain"),
            ("tests/fixtures/al_clear.jpg", "al"),
            # Add more test cases
        ]
        
        for image_path, expected_class in test_cases:
            image = cv2.imread(image_path)
            result = engine.infer_image(image)
            
            detected_classes = [d.class_name for d in result.detections]
            assert expected_class in detected_classes, \
                f"Expected {expected_class} in {detected_classes}"

    def test_confidence_threshold(self, engine):
        """Test that confidence threshold works."""
        image = cv2.imread("tests/fixtures/clear_sign.jpg")
        
        # High threshold - fewer detections
        result_high = engine.infer_image(image, conf_threshold=0.8)
        
        # Low threshold - more detections
        result_low = engine.infer_image(image, conf_threshold=0.1)
        
        assert len(result_low.detections) >= len(result_high.detections)
```

---

## Performance Testing

### Load Testing (Locust)

```python
# tests/load_test.py
from locust import HttpUser, task, between

class ASLUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login or setup if needed
        pass
    
    @task(3)
    def predict_image(self):
        with open("tests/fixtures/test-image.jpg", "rb") as f:
            files = {"file": ("test.jpg", f, "image/jpeg")}
            self.client.post("/api/v1/predict/image", files=files)
    
    @task(1)
    def check_health(self):
        self.client.get("/api/v1/health")
    
    @task(1)
    def get_sentence(self):
        self.client.get("/api/v1/sentence/state")

# Run: locust -f tests/load_test.py --host=http://localhost:8000
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.14'
          
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=backend --cov-report=xml
          
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: cd frontend && npm ci
        
      - name: Run tests
        run: cd frontend && npm run test -- --ci --coverage
        
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./frontend/coverage/lcov.info

  load-test:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Run load test
        run: |
          pip install locust
          locust -f tests/load_test.py --headless -u 10 -r 2 --run-time 60s
```

---

## Test Data Management

### Fixtures

```
tests/fixtures/
├── images/
│   ├── ain_clear.jpg
│   ├── al_clear.jpg
│   ├── blurry_hand.jpg
│   ├── dark_environment.jpg
│   └── multi_hand.jpg
├── videos/
│   ├── short_10s.mp4
│   └── long_60s.mp4
└── expected/
    ├── ain_detections.json
    └── al_detections.json
```

### Generating Test Data

```python
# scripts/generate_test_data.py
import cv2
import numpy as np
from pathlib import Path

def generate_test_images():
    fixtures = Path("tests/fixtures/images")
    fixtures.mkdir(parents=True, exist_ok=True)
    
    # Clean synthetic images for each class
    classes = [
        'ain', 'al', 'aleff', 'bb', 'dal', 'dha', 'dhad', 'fa',
        'gaaf', 'ghain', 'ha', 'haa', 'jeem', 'kaaf', 'khaa', 'la',
        'laam', 'meem', 'nun', 'ra', 'saad', 'seen', 'sheen', 'ta',
        'taa', 'thaa', 'thal', 'toot', 'waw', 'ya', 'yaa', 'zay'
    ]
    
    for cls in classes:
        # Create synthetic image with hand-like shape
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Add hand silhouette (simplified)
        cv2.ellipse(img, (320, 240), (100, 150), 0, 0, 360, (200, 200, 200), -1)
        cv2.imwrite(str(fixtures / f"{cls}_clear.jpg"), img)
    
    # Edge case images
    # Blurry
    blurry = cv2.GaussianBlur(img, (21, 21), 0)
    cv2.imwrite(str(fixtures / "blurry_hand.jpg"), blurry)
    
    # Dark
    dark = cv2.convertScaleAbs(img, alpha=0.3, beta=0)
    cv2.imwrite(str(fixtures / "dark_environment.jpg"), dark)

if __name__ == "__main__":
    generate_test_images()
```

---

## Accessibility Testing

```tsx
// frontend/tests/accessibility.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CameraView } from '@/features/camera/CameraView';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('CameraView has no accessibility violations', async () => {
    const { container } = render(<CameraView />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('SentenceBuilder supports RTL', async () => {
    const { container } = render(<SentenceBuilder sentence="ain al" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper heading hierarchy', () => {
    const { container } = render(<DashboardPage />);
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    expect(headings[0].tagName).toBe('H1');
    // Check proper nesting
  });
});
```

---

## Security Testing

```bash
# Dependency scanning
cd backend && pip-audit
cd frontend && npm audit

# SAST
bandit -r backend/
semgrep --config=auto backend/

# Container scanning
docker scan ghcr.io/org/asl-backend:latest
docker scan ghcr.io/org/asl-frontend:latest
```

---

## Continuous Testing Checklist

- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] E2E tests pass on all browsers
- [ ] Accessibility tests pass
- [ ] Performance benchmarks meet targets
- [ ] Security scans clean
- [ ] Load test completes without errors
- [ ] All test artifacts uploaded

---

## Debugging Tests

```bash
# Backend - verbose output
pytest tests/ -v -s --tb=long

# Frontend - debug mode
npm run test -- --debug

# Playwright - headed mode
npm run test:e2e -- --headed

# Specific test with breakpoints
pytest tests/test_inference.py::TestInference::test_predict_image -v -s --pdb
```