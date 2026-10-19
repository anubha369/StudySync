import sys
from pathlib import Path

# Ensure 'backend' directory is on sys.path so 'app.*' imports work from repo root
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
