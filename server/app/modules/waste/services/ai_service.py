from openai import AsyncOpenAI

from app.core.config import openaisettting
from app.modules.waste.schemas import (
    AIWasteAnalysis,
)


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
                    "content": (
                        "You are WasteWise waste classification AI. "
                        "Analyze the provided waste image carefully. "
                        "Identify every visible waste category and item. "
                        "Generate practical disposal instructions specific "
                        "to the items visible in the image. "
                        "Do not invent items that are not visible."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "Analyze this waste image and return "
                                "the structured WasteWise analysis."
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
            raise ValueError(
                "AI returned no valid waste analysis."
            )

        return response.output_parsed
