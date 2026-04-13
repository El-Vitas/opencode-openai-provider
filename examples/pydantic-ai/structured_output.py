import os

from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from env_loader import load_repo_env


class ContactCard(BaseModel):
    name: str
    email: str


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

    agent = Agent(model, output_type=ContactCard)
    result = agent.run_sync("Return a contact card for Jane Doe with email jane@example.com")
    print(result.output.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
