from openai import AsyncOpenAI

from server.app.core.config import openaisettting
from server.app.modules.waste.schemas import AIWasteAnalysis


class AIServiceError(Exception):
    """Base exception for WasteWise AI service errors."""

    pass


class AIService:

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=openaisettting.OPENAI_API_KEY
        )

    async def analyze_image(
        self,
        image_url: str,
    ) -> AIWasteAnalysis:

        response = await self.client.responses.parse(
            model=openaisettting.OPENAI_MODEL,
            input=[
                {
                    "role": "system",
                    "content": self._build_system_prompt(),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "Analyze this waste image and return "
                                "the complete structured WasteWise "
                                "analysis."
                            ),
                        },
                        {
                            "type": "input_image",
                            "image_url": image_url,
                        },
                    ],
                },
            ],
            text_format=AIWasteAnalysis,
        )

        if response.output_parsed is None:
            raise AIServiceError(
                "AI returned no valid waste analysis."
            )

        return response.output_parsed

    @staticmethod
    def _build_system_prompt() -> str:
        return """
You are the WasteWise waste classification and disposal assistant.

Analyze the provided image carefully and identify the waste that is
reasonably visible in the image.

For each detected waste category:

1. Identify the waste category.
2. List the identifiable waste items belonging to that category.
3. Provide a confidence score between 0 and 1.
4. Generate practical disposal instructions specifically for the
   items detected in this image.

Supported waste categories are:

- recyclable
- organic
- e_waste
- hazardous
- non_recyclable
- compostable

Important classification rules:

- Do not invent objects that are not reasonably visible.
- Do not claim an object is present when there is insufficient
  visual evidence.
- Group similar waste items together.
- Do not create separate items for identical individual objects
  unless necessary.
- Use only the supported waste categories.

Important disposal-instruction rules:

- Disposal instructions must be specific to the waste items
  actually detected in the image.
- Prefer practical, actionable instructions over generic statements.
- Do not simply say "dispose of properly" or "recycle this waste"
  when a more specific instruction can be provided.
- Combine repeated actions for similar items.
- Do not generate one step for every identical object.
- Keep instructions concise and easy for a normal user to follow.
- Generate a reasonable number of steps, normally between 1 and 8
  for each category.
- Do not generate instructions for items that were not detected.

The final response must follow the provided structured output schema.
"""