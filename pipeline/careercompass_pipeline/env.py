"""Load pipeline/.env into os.environ (no external dependency).

Lines of KEY=VALUE; # comments and blank lines ignored. Real environment
variables always win over .env values.
"""
import os

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")


def load_env():
    if not os.path.exists(ENV_PATH):
        return
    with open(ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_env()
