# app/modules/waste/services/image_service.py

import asyncio
from dataclasses import dataclass

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from app.core.config import cloudinarysetting


# ============================================================
# EXCEPTIONS
# ============================================================


class ImageServiceError(Exception):
    """
    Base exception for image-service related errors.
    """

    pass


class InvalidImageError(ImageServiceError):
    """
    Raised when the uploaded image is invalid or unsupported.
    """

    pass


class ImageUploadError(ImageServiceError):
    """
    Raised when the image upload to Cloudinary fails.
    """

    pass


# ============================================================
# UPLOAD RESULT
# ============================================================


@dataclass
class UploadedImage:
    """
    Information returned after a successful Cloudinary upload.
    """

    url: str
    public_id: str


# ============================================================
# IMAGE SERVICE
# ============================================================


class ImageService:
    """
    Handles image validation and Cloudinary uploads.

    Responsibilities:
        - Validate uploaded image
        - Validate image type
        - Validate image size
        - Upload image to Cloudinary
        - Return secure Cloudinary URL

    MVP:
        - Images are not deleted.
        - Actual image is stored on Cloudinary.
        - Only the Cloudinary URL is stored in the database.
    """

    # --------------------------------------------------------
    # Image configuration
    # --------------------------------------------------------

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    ALLOWED_CONTENT_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    CLOUDINARY_FOLDER = "wastewise/waste"

    # --------------------------------------------------------
    # Initialization
    # --------------------------------------------------------

    def __init__(self):
        """
        Configure Cloudinary using application settings.
        """

        cloudinary.config(
            cloud_name=cloudinarysetting.CLOUDINARY_CLOUD_NAME,
            api_key=cloudinarysetting.CLOUDINARY_API_KEY,
            api_secret=cloudinarysetting.CLOUDINARY_API_SECRET,
            secure=cloudinarysetting.SECURE,
        )

    # ========================================================
    # VALIDATE IMAGE
    # ========================================================

    async def validate_image(
        self,
        file: UploadFile,
    ) -> bytes:
        """
        Validate the uploaded image and return its bytes.

        Validation:
            - File must be provided
            - Content type must be supported
            - File must not be empty
            - File must not exceed 10 MB
        """

        # ----------------------------------------------------
        # Check file
        # ----------------------------------------------------

        if file is None:
            raise InvalidImageError(
                "No image file was provided."
            )

        # ----------------------------------------------------
        # Check content type
        # ----------------------------------------------------

        if file.content_type not in self.ALLOWED_CONTENT_TYPES:
            raise InvalidImageError(
                "Unsupported image format. "
                "Allowed formats are JPEG, PNG and WebP."
            )

        # ----------------------------------------------------
        # Read file
        # ----------------------------------------------------

        try:
            file_bytes = await file.read()

        except Exception as exc:
            raise InvalidImageError(
                "Unable to read the uploaded image."
            ) from exc

        # ----------------------------------------------------
        # Check empty file
        # ----------------------------------------------------

        if not file_bytes:
            raise InvalidImageError(
                "The uploaded image is empty."
            )

        # ----------------------------------------------------
        # Check file size
        # ----------------------------------------------------

        if len(file_bytes) > self.MAX_FILE_SIZE:
            raise InvalidImageError(
                "Image size cannot exceed 10 MB."
            )

        return file_bytes

    # ========================================================
    # UPLOAD IMAGE
    # ========================================================

    async def upload_image(
        self,
        file: UploadFile,
    ) -> UploadedImage:
        """
        Validate and upload an image to Cloudinary.

        Returns:
            UploadedImage(
                url="https://...",
                public_id="..."
            )
        """

        try:
            # ------------------------------------------------
            # Validate image
            # ------------------------------------------------

            file_bytes = await self.validate_image(
                file=file,
            )

            # ------------------------------------------------
            # Upload to Cloudinary
            # ------------------------------------------------

            upload_result = await asyncio.to_thread(
                cloudinary.uploader.upload,
                file_bytes,
                folder=self.CLOUDINARY_FOLDER,
                resource_type="image",
            )

            # ------------------------------------------------
            # Get secure URL
            # ------------------------------------------------

            secure_url = upload_result.get("secure_url")

            if not secure_url:
                raise ImageUploadError(
                    "Cloudinary did not return a secure image URL."
                )

            # ------------------------------------------------
            # Get public ID
            # ------------------------------------------------

            public_id = upload_result.get("public_id")

            if not public_id:
                raise ImageUploadError(
                    "Cloudinary did not return an image public ID."
                )

            return UploadedImage(
                url=secure_url,
                public_id=public_id,
            )

        except InvalidImageError:
            # Do not hide our validation error.
            raise

        except ImageUploadError:
            # Do not wrap our own upload errors again.
            raise

        except Exception as exc:
            raise ImageUploadError(
                "Failed to upload image to Cloudinary."
            ) from exc
