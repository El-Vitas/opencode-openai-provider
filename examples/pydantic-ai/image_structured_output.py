import os
from pathlib import Path

from pydantic import BaseModel
from pydantic_ai import Agent, BinaryContent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from env_loader import load_repo_env


class ImageAnalysis(BaseModel):
    short_description: str
    likely_context: str
    contains_people: bool


def load_required_env(variable_name: str) -> str:
    value = os.getenv(variable_name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {variable_name}")
    return value


def main() -> None:
    load_repo_env()

    base_url = load_required_env("OPENAI_BASE_URL")
    api_key = load_required_env("OPENAI_API_KEY")
    model_name = load_required_env("OPENAI_MODEL")

    image_path = Path(__file__).resolve().with_name("test-image.jpg")
    if not image_path.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")

    model = OpenAIChatModel(
        model_name,
        provider=OpenAIProvider(
            base_url=base_url,
            api_key=api_key,
        ),
    )

    agent = Agent(model, output_type=ImageAnalysis, output_retries=5)
    result = agent.run_sync(
        [
            (
                "Analyze this image and return JSON using the output schema fields only."
            ),
            BinaryContent.from_path(image_path),
        ]
    )

    print(result.output.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
