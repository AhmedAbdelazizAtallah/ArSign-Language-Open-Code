import pytest
import numpy as np
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from io import BytesIO

from backend.main import create_app
from backend.services.inference_service import InferenceService
from backend.services.sentence_service import SentenceService
from backend.services.history_service import HistoryService
from backend.services.settings_service import SettingsService
from backend.models.domain import DetectionModel, InferenceResult


@pytest.fixture
def client():
    """Create test client."""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def mock_inference_service():
    """Mock inference service."""
    service = Mock(spec=InferenceService)
    service.infer_image = Mock(return_value=InferenceResult(
        detections=[
            DetectionModel(bbox=[100, 100, 200, 200], confidence=0.9, class_id=0, class_name='ain'),
            DetectionModel(bbox=[300, 300, 400, 400], confidence=0.8, class_id=1, class_name='al'),
        ],
        preprocess_ms=1.5,
        inference_ms=3.2,
        nms_ms=0.8,
        total_ms=5.5,
        fps=181.8,
        provider='CPUExecutionProvider'
    ))
    service.get_stats = Mock(return_value={
        'total_inferences': 10,
        'avg_preprocess_ms': 1.5,
        'avg_inference_ms': 3.2,
        'avg_nms_ms': 0.8,
        'avg_total_ms': 5.5,
        'errors': 0
    })
    return service


@pytest.fixture
def sample_image():
    """Create sample image file."""
    import cv2
    image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', image)
    return BytesIO(buffer.tobytes())


class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_check(self, client):
        """Test health endpoint returns status."""
        response = client.get('/api/v1/health')
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'status' in data
        assert 'version' in data


class TestInferenceEndpoints:
    """Test inference endpoints."""

    def test_predict_image_success(self, client, sample_image, mock_inference_service):
        """Test image prediction endpoint."""
        with patch('backend.api.v1.predict.get_inference_service', return_value=mock_inference_service):
            response = client.post(
                '/api/v1/predict/image',
                files={'file': ('test.jpg', sample_image, 'image/jpeg')}
            )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'predictions' in data
        assert len(data['predictions']) == 2
        assert data['predictions'][0]['class_name'] == 'ain'

    def test_predict_image_invalid_file(self, client):
        """Test image prediction with invalid file."""
        response = client.post(
            '/api/v1/predict/image',
            files={'file': ('test.txt', b'not an image', 'text/plain')}
        )
        assert response.status_code == 400

    def test_predict_camera_frame(self, client, mock_inference_service):
        """Test camera frame prediction."""
        import base64
        frame_data = base64.b64encode(b'fake image data').decode()

        with patch('backend.api.v1.predict.get_inference_service', return_value=mock_inference_service):
            response = client.post(
                '/api/v1/predict/camera',
                data={'frame': frame_data}
            )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True


class TestSentenceEndpoints:
    """Test sentence builder endpoints."""

    def test_get_sentence_state(self, client):
        """Test getting sentence state."""
        response = client.get('/api/v1/sentence/state')
        assert response.status_code == 200
        data = response.json()
        assert 'sentence' in data
        assert 'words' in data
        assert 'can_undo' in data

    def test_add_letter(self, client):
        """Test adding letter to sentence."""
        response = client.post('/api/v1/sentence/add', json={'letter': 'ain', 'confidence': 0.9})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True

    def test_add_space(self, client):
        """Test adding space."""
        response = client.post('/api/v1/sentence/space')
        assert response.status_code == 200

    def test_undo(self, client):
        """Test undo."""
        response = client.post('/api/v1/sentence/undo')
        assert response.status_code == 200

    def test_redo(self, client):
        """Test redo."""
        response = client.post('/api/v1/sentence/redo')
        assert response.status_code == 200

    def test_reset_sentence(self, client):
        """Test reset sentence."""
        response = client.post('/api/v1/sentence/reset')
        assert response.status_code == 200

    def test_export_sentence(self, client):
        """Test export sentence."""
        response = client.post('/api/v1/sentence/export', json={'format': 'json'})
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True


class TestHistoryEndpoints:
    """Test history endpoints."""

    def test_get_history(self, client):
        """Test getting history."""
        response = client.get('/api/v1/history')
        assert response.status_code == 200
        data = response.json()
        assert 'entries' in data
        assert 'total' in data

    def test_get_history_with_pagination(self, client):
        """Test history pagination."""
        response = client.get('/api/v1/history?page=1&page_size=10')
        assert response.status_code == 200
        data = response.json()
        assert data['page'] == 1
        assert data['page_size'] == 10

    def test_clear_history(self, client):
        """Test clearing history."""
        response = client.delete('/api/v1/history')
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'deleted_count' in data

    def test_export_history(self, client):
        """Test exporting history."""
        for fmt in ['json', 'csv', 'txt']:
            response = client.get(f'/api/v1/history/export?format={fmt}')
            assert response.status_code == 200


class TestSettingsEndpoints:
    """Test settings endpoints."""

    def test_get_settings(self, client):
        """Test getting settings."""
        response = client.get('/api/v1/settings')
        assert response.status_code == 200
        data = response.json()
        assert 'conf_threshold' in data
        assert 'theme' in data
        assert 'language' in data

    def test_update_settings(self, client):
        """Test updating settings."""
        response = client.put('/api/v1/settings', json={
            'conf_threshold': 0.5,
            'theme': 'dark'
        })
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['settings']['conf_threshold'] == 0.5
        assert data['settings']['theme'] == 'dark'

    def test_reset_settings(self, client):
        """Test resetting settings."""
        response = client.post('/api/v1/settings/reset')
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True


class TestMetricsEndpoints:
    """Test metrics endpoints."""

    def test_get_metrics(self, client):
        """Test getting metrics."""
        response = client.get('/api/v1/metrics')
        assert response.status_code == 200
        data = response.json()
        assert 'system' in data
        assert 'inference' in data
        assert 'model' in data

    def test_get_prometheus_metrics(self, client):
        """Test Prometheus metrics format."""
        response = client.get('/api/v1/metrics/prometheus')
        assert response.status_code == 200
        assert 'asl_cpu_percent' in response.text
        assert 'asl_memory_percent' in response.text


class TestInferenceService:
    """Test inference service."""

    @pytest.fixture
    def service(self):
        """Create inference service with mocked model."""
        with patch('backend.services.inference_service.ModelService') as mock_model:
            mock_session = Mock()
            mock_session.get_inputs.return_value = [Mock(name='input', shape=[1, 3, 640, 640])]
            mock_session.get_outputs.return_value = [Mock(name='output')]
            mock_session.run.return_value = [np.random.randn(1, 32, 8400).astype(np.float32)]
            mock_model.return_value.session = mock_session
            mock_model.return_value.input_name = 'input'
            mock_model.return_value.output_names = ['output']

            service = InferenceService()
            service.model_service = mock_model.return_value
            return service

    def test_preprocess(self, service):
        """Test image preprocessing."""
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        tensor, meta = service.preprocess(image)

        assert tensor.shape == (1, 3, 640, 640)
        assert tensor.dtype == np.float32
        assert 'original_shape' in meta

    def test_postprocess(self, service):
        """Test postprocessing."""
        outputs = np.random.randn(1, 32, 8400).astype(np.float32)
        # Make some detections
        outputs[0, 0, :4] = [320, 320, 100, 100]
        outputs[0, 0, 4] = 0.9
        outputs[0, 0, 5] = 0.9

        meta = {
            'original_shape': (480, 640),
            'scale': 1.0,
            'padding': (0, 0),
            'resized_shape': (640, 640)
        }

        detections = service.postprocess(outputs, meta)
        assert isinstance(detections, list)


class TestSentenceService:
    """Test sentence service."""

    @pytest.fixture
    def service(self):
        return SentenceService()

    def test_add_letter(self, service):
        """Test adding letter."""
        added = service.add_letter('ain', 0.9)
        assert added is True
        state = service.get_state()
        assert 'ain' in state['sentence']

    def test_add_space(self, service):
        """Test adding space."""
        service.add_letter('ain', 0.9)
        added = service.add_space()
        assert added is True
        state = service.get_state()
        assert 'ain ' in state['sentence']

    def test_undo_redo(self, service):
        """Test undo/redo."""
        service.add_letter('ain', 0.9)
        service.undo()
        assert service.get_state()['sentence'] == ''
        service.redo()
        assert 'ain' in service.get_state()['sentence']

    def test_clear(self, service):
        """Test clear."""
        service.add_letter('ain', 0.9)
        service.clear()
        assert service.get_state()['sentence'] == ''


class TestSettingsService:
    """Test settings service."""

    @pytest.fixture
    def service(self):
        return SettingsService()

    def test_get_all(self, service):
        """Test getting all settings."""
        settings = service.get_all()
        assert 'conf_threshold' in settings
        assert 'theme' in settings

    def test_update_settings(self, service):
        """Test updating settings."""
        updated = service.update({'conf_threshold': 0.5, 'theme': 'dark'})
        assert updated['conf_threshold'] == 0.5
        assert updated['theme'] == 'dark'

    def test_reset_settings(self, service):
        """Test resetting settings."""
        service.update({'conf_threshold': 0.5})
        reset = service.reset()
        assert reset['conf_threshold'] == 0.3  # default


class TestHistoryService:
    """Test history service."""

    @pytest.fixture
    def service(self):
        return HistoryService()

    def test_add_entry(self, service):
        """Test adding history entry."""
        from backend.models.domain import DetectionModel

        entry = service.add_entry(
            source='image',
            source_name='test.jpg',
            detections=[DetectionModel(bbox=[0, 0, 100, 100], confidence=0.9, class_id=0, class_name='ain')],
            sentence='ain',
            latency_ms=10.0,
            fps=100.0,
            avg_confidence=0.9
        )

        assert entry.source == 'image'
        assert entry.sentence == 'ain'

    def test_get_history(self, service):
        """Test getting history."""
        from backend.models.domain import DetectionModel

        service.add_entry('image', 'test.jpg', [], 'test', 10.0, 100.0, 0.9)
        history = service.get_history(page=1, page_size=10)

        assert history['total'] == 1
        assert len(history['entries']) == 1

    def test_clear_history(self, service):
        """Test clearing history."""
        from backend.models.domain import DetectionModel

        service.add_entry('image', 'test.jpg', [], 'test', 10.0, 100.0, 0.9)
        count = service.clear_history()
        assert count == 1

        history = service.get_history()
        assert history['total'] == 0