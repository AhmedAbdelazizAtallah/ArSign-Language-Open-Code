import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import numpy as np
from unittest.mock import Mock

# Configure pytest
pytest_plugins = []

def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "gpu: marks tests requiring GPU")


@pytest.fixture(scope="session")
def sample_image():
    """Create a sample test image."""
    return np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)


@pytest.fixture(scope="session")
def sample_detections():
    """Create sample detections for testing."""
    return [
        {'bbox': [100, 100, 200, 200], 'confidence': 0.9, 'class_id': 0, 'class_name': 'ain'},
        {'bbox': [300, 300, 400, 400], 'confidence': 0.8, 'class_id': 1, 'class_name': 'al'},
    ]


@pytest.fixture
def mock_onnx_session():
    """Create a mock ONNX session."""
    session = Mock()
    session.get_inputs.return_value = [Mock(name='input', shape=[1, 3, 640, 640])]
    session.get_outputs.return_value = [Mock(name='output')]
    session.run.return_value = [np.random.randn(1, 32, 8400).astype(np.float32)]
    session.get_providers.return_value = ['CPUExecutionProvider']
    return session