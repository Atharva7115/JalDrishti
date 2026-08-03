import os
import sys
import importlib.util

# Resolve namespace conflict: register the 'app' directory as the 'app' package in sys.modules
# before any relative or absolute imports are executed.
current_dir = os.path.dirname(os.path.abspath(__file__))
app_init_path = os.path.join(current_dir, "app", "__init__.py")

# Create __init__.py if it doesn't exist to make it a valid package
if not os.path.exists(app_init_path):
    os.makedirs(os.path.join(current_dir, "app"), exist_ok=True)
    with open(app_init_path, "w") as f:
        f.write("# JalDrishti app package\n")

spec = importlib.util.spec_from_file_location("app", app_init_path)
app_package = importlib.util.module_from_spec(spec)
sys.modules["app"] = app_package
spec.loader.exec_module(app_package)

# Now absolute imports like `from app.main import app` will resolve correctly
from app.main import app
