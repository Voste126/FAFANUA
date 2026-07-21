"""
storyteller/views.py

HTTP layer for the Fafanua slide generation API.

This module contains only HTTP-level concerns: request parsing, input
validation, error translation, and response serialisation. All business
logic and external-API communication lives in services.py.
"""

import logging

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import WatsonxService

logger = logging.getLogger(__name__)


class GeneratePresentationView(APIView):
    """POST /api/generate/ — converts technical text into a JSON slide deck.

    Accepts a JSON body containing ``technical_content``, delegates the heavy
    lifting to :class:`~storyteller.services.WatsonxService`, and returns a
    structured slide array ready for the React frontend to render.

    HTTP Methods:
        POST

    Request Body (JSON)::

        {
            "technical_content": "<dense technical text, code, or architecture docs>"
        }

    Successful Response — 200 OK::

        [
            {
                "title": "...",
                "bullet_points": ["...", "..."],
                "theme_variant": "warm" | "bold" | "clean"
            },
            ...
        ]

    Error Responses:
        - **400 Bad Request** — ``technical_content`` is missing or blank.
        - **502 Bad Gateway** — watsonx.ai API returned an upstream error.
        - **500 Internal Server Error** — Unexpected server-side failure or
          unparseable model response.
    """

    def post(self, request: Request, *args, **kwargs) -> Response:
        """Handle POST requests by generating a slide deck via IBM watsonx.ai.

        Args:
            request: The DRF request object. Expects a JSON body with the key
                ``technical_content``.
            *args: Additional positional arguments (passed through, unused).
            **kwargs: Additional keyword arguments (passed through, unused).

        Returns:
            A :class:`rest_framework.response.Response` containing either:

            - A ``list`` of slide dicts on success (HTTP 200).
            - An error dict with a ``detail`` key on failure (HTTP 400/500/502).
        """
        # ------------------------------------------------------------------ #
        # 1. Input validation
        # ------------------------------------------------------------------ #
        technical_content: str = request.data.get("technical_content", "").strip()

        if not technical_content:
            return Response(
                {
                    "detail": (
                        "'technical_content' is required and must not be blank. "
                        "Paste your technical text, code snippet, or architecture "
                        "notes into this field."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------------------ #
        # 2. Delegate to the service layer
        # ------------------------------------------------------------------ #
        try:
            service = WatsonxService()
            slides = service.generate_slides(technical_content)

        except EnvironmentError as exc:
            # Misconfigured server — watsonx credentials not set in .env
            logger.error("WatsonxService configuration error: %s", exc)
            return Response(
                {"detail": f"Server configuration error: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        except RuntimeError as exc:
            # watsonx.ai upstream API failure (network, auth, quota, etc.)
            logger.error("watsonx.ai upstream error: %s", exc)
            return Response(
                {
                    "detail": (
                        "The AI service returned an error. "
                        "Please try again in a moment."
                    ),
                    "upstream_error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError as exc:
            # Model returned non-parseable output
            logger.error("JSON parse error from model response: %s", exc)
            return Response(
                {
                    "detail": (
                        "The AI model returned an unexpected response format. "
                        "This is likely transient — please retry your request."
                    ),
                    "parse_error": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ------------------------------------------------------------------ #
        # 3. Return structured slide data
        # ------------------------------------------------------------------ #
        logger.info("Successfully generated %d slides.", len(slides))
        return Response(slides, status=status.HTTP_200_OK)
