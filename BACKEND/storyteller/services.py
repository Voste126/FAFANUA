"""
storyteller/services.py

Service layer for IBM watsonx.ai integration.

This module contains all business logic related to calling the IBM Granite
model. It maintains strict separation of concerns: views handle HTTP;
services handle external API communication.
"""

import json
import logging
import os
from typing import Any

from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Zero-shot system prompt — model is instructed to output ONLY raw JSON.
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """\
You are a Technical Storyteller and expert presentation architect.
Your sole task is to transform dense technical text into a structured,
human-centered slide deck represented as a strict JSON array.

Rules you MUST follow without exception:
1. Output ONLY a raw JSON array. No markdown fences, no prose, no commentary.
2. Every element of the array must be a JSON object with exactly three keys:
   - "title"         : string  — a concise, punchy slide title.
   - "bullet_points" : array   — 3 to 5 short, audience-friendly bullet points.
   - "theme_variant" : string  — MUST be one of: "warm", "bold", or "clean".
     Assign themes meaningfully: "warm" for introductions/context, "bold" for
     key breakthroughs/results, "clean" for details/specifications.
3. Generate between 4 and 8 slides.
4. Bullet points must be human-readable sentences, not raw code or jargon.

Begin your output immediately with the opening '[' of the JSON array.
"""


class WatsonxService:
    """Encapsulates all IBM watsonx.ai SDK interactions for slide generation.

    Attributes:
        _url: The IBM watsonx.ai service endpoint URL.
        _api_key: The IBM Cloud API key for authentication.
        _project_id: The watsonx.ai project identifier.
        _model_id: The Granite model identifier to use for inference.
    """

    _model_id: str = "ibm/granite-3-3-8b-instruct"

    def __init__(self) -> None:
        """Initialises the service by securely loading credentials from env vars.

        Raises:
            EnvironmentError: If any required environment variable is absent or blank.
        """
        required_vars: dict[str, str | None] = {
            "WATSONX_URL": os.environ.get("WATSONX_URL"),
            "WATSONX_APIKEY": os.environ.get("WATSONX_APIKEY"),
            "WATSONX_PROJECT_ID": os.environ.get("WATSONX_PROJECT_ID"),
        }

        missing = [k for k, v in required_vars.items() if not v]
        if missing:
            raise EnvironmentError(
                f"Missing required environment variable(s): {', '.join(missing)}. "
                "Ensure your .env file is properly configured."
            )

        self._url: str = required_vars["WATSONX_URL"]          # type: ignore[assignment]
        self._api_key: str = required_vars["WATSONX_APIKEY"]   # type: ignore[assignment]
        self._project_id: str = required_vars["WATSONX_PROJECT_ID"]  # type: ignore[assignment]

    def generate_slides(self, technical_content: str) -> list[dict[str, Any]]:
        """Sends technical content to Granite and returns structured slide data.

        Constructs a zero-shot prompt combining the system instruction with
        the user-provided technical text, invokes the Granite model, and
        parses the guaranteed-JSON response into a Python list of slide dicts.

        Args:
            technical_content: The raw technical text (code, architecture docs,
                system logs, etc.) to be transformed into slide content.

        Returns:
            A list of slide dictionaries, each containing:
                - ``title`` (str): The slide heading.
                - ``bullet_points`` (list[str]): Audience-friendly bullet points.
                - ``theme_variant`` (str): One of ``"warm"``, ``"bold"``, or ``"clean"``.

        Raises:
            RuntimeError: If the watsonx.ai API call itself fails.
            ValueError: If the model response cannot be parsed as valid JSON.
        """
        credentials = Credentials(url=self._url, api_key=self._api_key)

        model = ModelInference(
            model_id=self._model_id,
            credentials=credentials,
            project_id=self._project_id,
            params={
                GenParams.MAX_NEW_TOKENS: 2048,
                GenParams.TEMPERATURE: 0.3,
                GenParams.TOP_P: 0.9,
                GenParams.STOP_SEQUENCES: [],
            },
        )

        prompt: str = (
            f"{_SYSTEM_PROMPT}\n\n"
            f"TECHNICAL CONTENT TO TRANSFORM:\n"
            f"---\n"
            f"{technical_content}\n"
            f"---\n\n"
            f"JSON SLIDE DECK:"
        )

        logger.info(
            "Sending request to watsonx.ai [model=%s, content_length=%d]",
            self._model_id,
            len(technical_content),
        )

        try:
            response: str = model.generate_text(prompt=prompt)
        except Exception as exc:
            logger.exception("watsonx.ai API call failed: %s", exc)
            raise RuntimeError(
                f"The IBM watsonx.ai API returned an error: {exc}"
            ) from exc

        raw_text: str = response.strip()
        logger.debug("Raw model response: %s", raw_text)

        # Guard: strip accidental markdown code fences if the model ignores rules.
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        try:
            slides: list[dict[str, Any]] = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            logger.error(
                "Failed to parse model response as JSON. Raw response: %s", raw_text
            )
            raise ValueError(
                f"Model did not return valid JSON. Parse error: {exc}. "
                f"Raw response (first 500 chars): {raw_text[:500]}"
            ) from exc

        if not isinstance(slides, list):
            raise ValueError(
                f"Expected a JSON array from the model, but received: {type(slides).__name__}"
            )

        return slides

    # ------------------------------------------------------------------ #
    # Slide refinement
    # ------------------------------------------------------------------ #

    _REFINE_PROMPT = """\
You are a Technical Storyteller refining a single presentation slide.
You will receive the CURRENT slide as JSON and a user INSTRUCTION describing
what should change.

Rules you MUST follow without exception:
1. Output ONLY a single raw JSON object. No markdown fences, no prose, no array.
2. The JSON object must have exactly three keys:
   - "title"         : string  — a concise, punchy slide title.
   - "bullet_points" : array   — 3 to 5 short, audience-friendly bullet points.
   - "theme_variant" : string  — MUST be one of: "warm", "bold", or "clean".
3. Apply the user's instruction faithfully while keeping the slide coherent.
4. If the instruction does not mention the theme, keep the current theme.

Begin your output immediately with the opening '{' of the JSON object.
"""

    def refine_slide(
        self,
        current_slide_data: dict[str, Any],
        instruction: str,
    ) -> dict[str, Any]:
        """Refines a single slide according to user feedback via Granite.

        Constructs a prompt that provides the model with the current slide
        content and a natural-language instruction, then returns the
        rewritten slide as a Python dict.

        Args:
            current_slide_data: Dict with keys ``title``, ``bullet_points``,
                and ``theme_variant`` representing the slide to refine.
            instruction: Free-text feedback from the user describing the
                desired change (e.g. "Make this less technical").

        Returns:
            A dict containing the refined ``title``, ``bullet_points``, and
            ``theme_variant``.

        Raises:
            RuntimeError: If the watsonx.ai API call itself fails.
            ValueError: If the model response cannot be parsed as valid JSON
                or is not a JSON object.
        """
        credentials = Credentials(url=self._url, api_key=self._api_key)

        model = ModelInference(
            model_id=self._model_id,
            credentials=credentials,
            project_id=self._project_id,
            params={
                GenParams.MAX_NEW_TOKENS: 1024,
                GenParams.TEMPERATURE: 0.5,
                GenParams.TOP_P: 0.9,
                GenParams.STOP_SEQUENCES: [],
            },
        )

        current_json = json.dumps(current_slide_data, indent=2)

        prompt: str = (
            f"{self._REFINE_PROMPT}\n\n"
            f"CURRENT SLIDE:\n"
            f"---\n"
            f"{current_json}\n"
            f"---\n\n"
            f"USER INSTRUCTION:\n"
            f"---\n"
            f"{instruction}\n"
            f"---\n\n"
            f"REFINED SLIDE JSON:"
        )

        logger.info(
            "Sending refinement request to watsonx.ai [model=%s, instruction_length=%d]",
            self._model_id,
            len(instruction),
        )

        try:
            response: str = model.generate_text(prompt=prompt)
        except Exception as exc:
            logger.exception("watsonx.ai refinement API call failed: %s", exc)
            raise RuntimeError(
                f"The IBM watsonx.ai API returned an error: {exc}"
            ) from exc

        raw_text: str = response.strip()
        logger.debug("Raw refinement response: %s", raw_text)

        # Guard: strip accidental markdown code fences.
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        try:
            refined: dict[str, Any] = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            logger.error(
                "Failed to parse refinement response as JSON. Raw: %s", raw_text
            )
            raise ValueError(
                f"Model did not return valid JSON. Parse error: {exc}. "
                f"Raw response (first 500 chars): {raw_text[:500]}"
            ) from exc

        # The model may occasionally wrap the object in an array.
        if isinstance(refined, list):
            if len(refined) == 1 and isinstance(refined[0], dict):
                refined = refined[0]
            else:
                raise ValueError(
                    f"Expected a single JSON object, but received an array "
                    f"with {len(refined)} elements."
                )

        if not isinstance(refined, dict):
            raise ValueError(
                f"Expected a JSON object from the model, but received: "
                f"{type(refined).__name__}"
            )

        return refined
