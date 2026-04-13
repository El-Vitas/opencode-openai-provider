import os
from pathlib import Path


def _strip_optional_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def load_repo_env() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    env_path = repo_root / ".env"

    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if "=" not in line:
            continue

        key, raw_value = line.split("=", 1)
        variable_name = key.strip()
        variable_value = _strip_optional_quotes(raw_value.strip())

        if variable_name:
            os.environ.setdefault(variable_name, variable_value)
