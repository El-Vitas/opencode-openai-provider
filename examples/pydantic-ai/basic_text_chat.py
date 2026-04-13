import os

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from env_loader import load_repo_env


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

    model = OpenAIChatModel(
        model_name,
        provider=OpenAIProvider(
            base_url=base_url,
            api_key=api_key,
        ),
    )

    agent = Agent(model)
    result = agent.run_sync("Say hello in one short sentence.")
    print(result.output)


if __name__ == "__main__":
    main()
