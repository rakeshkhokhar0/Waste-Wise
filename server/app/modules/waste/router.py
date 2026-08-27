from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.waste.services.image_services import (
    ImageService,
    InvalidImageError,
    ImageUploadError,
)
from app.modules.waste.services.ai_service import AIService


router = APIRouter(
    prefix="/waste",
    tags=["Waste"],
)


@router.post("/analyze")
async def analyze_waste(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
):
    try:
        # ----------------------------------------------------
        # 1. Upload image to Cloudinary
        # ----------------------------------------------------
        image_service = ImageService()

        uploaded_image = await image_service.upload_image(
            file=file
        )

        # ----------------------------------------------------
        # 2. Analyze image using AI
        # ----------------------------------------------------
        ai_service = AIService()

        analysis = await ai_service.analyze_image(
            image_url=uploaded_image.url
        )

        # ----------------------------------------------------
        # 3. Return AI result
        # ----------------------------------------------------
        return {
            "image_url": uploaded_image.url,
            "summary": analysis.summary,
            "categories": [
                {
                    "category": category.category.value,
                    "items": category.items,
                    "confidence": category.confidence,
                    "disposal_steps": category.disposal_steps,
                }
                for category in analysis.categories
            ],
        }

    except InvalidImageError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except ImageUploadError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Waste analysis failed: {str(exc)}",
        )