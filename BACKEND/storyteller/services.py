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
import re
from typing import Any

from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Zero-shot system prompt — model is instructed to output ONLY raw JSON.
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """\
You are a Senior Principal Engineer and Technical Architect. Your task is to convert the user's raw technical text, code snippets, or system logs into a highly detailed, professional presentation slide deck.

CRITICAL INSTRUCTIONS:
1. DYNAMIC LENGTH: Do NOT automatically generate 5 slides. Analyze the density of the input and generate as many slides as necessary to properly cover the material (e.g., anywhere from 3 to 12 slides).
2. TECHNICAL DEPTH: Do not abstract away or "dumb down" the content. Retain specific metrics, library names, bottlenecks, architecture nuances, and code references mentioned in the text. Bullet points must be deep, data-backed technical statements, not generic summaries.
3. ADVANCED DIAGRAMS: For slides describing architecture, data flows, or processes, generate a detailed Mermaid.js string in the 'diagram_code' field.
   - Do NOT make simple A --> B diagrams.
   - Use `subgraph` to group related components (e.g., Frontend, Backend, Cloud, Database) when appropriate.
   - Add descriptive labels to your arrows (e.g., `A -->|REST API| B` or `Client -->|HTTPS/JSON| Gateway`).
   - Use appropriate diagram types (`graph TB`, `graph TD`, `sequenceDiagram`).
   - Ensure node IDs contain NO spaces or special characters (e.g., use `A[API Gateway]`, `Svc1[Auth Service]`).
   - If no diagram fits the slide, leave 'diagram_code' as an empty string "".
4. FORMAT: You MUST return ONLY a valid JSON array of objects. Do NOT include markdown code formatting (like ```json or ```), no conversational preamble (such as "Here is your JSON:"), and no commentary.

JSON Schema per object:
{
  "title": "Specific, technical slide title",
  "bullet_points": ["Deep technical point 1", "Data-backed point 2", "Detailed point 3"],
  "theme_variant": "warm", // Choose from: warm, bold, clean, analytical
  "diagram_code": "graph TD; ... (or empty string)"
}

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

    _model_id: str = os.environ.get("WATSONX_MODEL_ID", "ibm/granite-4-h-small")

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
        self._model_id: str = os.environ.get("WATSONX_MODEL_ID", "ibm/granite-4-h-small")

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
                GenParams.STOP_SEQUENCES: ["TECHNICAL CONTENT TO TRANSFORM:", "\nTECHNICAL CONTENT"],
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
            print(f"Watsonx API Error: {str(exc)}")
            logger.exception("watsonx.ai API call failed: %s", exc)
            raise RuntimeError(
                f"The IBM watsonx.ai API returned an error: {exc}"
            ) from exc

        raw_text: str = response.strip()
        logger.debug("Raw model response: %s", raw_text)

        slides = self._extract_and_parse_json(raw_text, expected_type=list)

        if not isinstance(slides, list):
            raise ValueError(
                f"Expected a JSON array from the model, but received: {type(slides).__name__}"
            )

        # Sanitise diagram_code in each slide for Mermaid v11 compatibility
        for slide in slides:
            if slide.get("diagram_code"):
                slide["diagram_code"] = self._sanitize_diagram_code(
                    slide["diagram_code"]
                )

        return slides    # ------------------------------------------------------------------ #
    # JSON extraction and sanitisation helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _extract_and_parse_json(text: str, expected_type: type = list) -> Any:
        """Extracts and parses the first JSON array or object from raw LLM output.

        Handles:
        - Markdown code blocks (```json ... ```).
        - Conversational text preceding the JSON.
        - Repeated prompt text / few-shot loops trailing after the first JSON object or array.
        """
        raw_text = text.strip()

        # Guard 1: Strip markdown code blocks if present
        if "```" in raw_text:
            parts = raw_text.split("```")
            for part in parts:
                clean_part = part.strip()
                if clean_part.startswith("json"):
                    clean_part = clean_part[4:].strip()
                if (expected_type is list and clean_part.startswith("[")) or (
                    expected_type is dict and clean_part.startswith("{")
                ):
                    raw_text = clean_part
                    break

        # Guard 2: Locate start of array '[' or object '{'
        start_char = "[" if expected_type is list else "{"
        start_idx = raw_text.find(start_char)
        if start_idx != -1:
            raw_text = raw_text[start_idx:]

        # Guard 3: Use JSONDecoder.raw_decode to parse ONLY the first JSON structure,
        # completely ignoring trailing repeated prompt text, extra data, or hallucinated text.
        decoder = json.JSONDecoder()
        try:
            data, _ = decoder.raw_decode(raw_text)
            return data
        except json.JSONDecodeError:
            # Fallback to standard json.loads if raw_decode fails
            try:
                return json.loads(raw_text)
            except json.JSONDecodeError as exc:
                print(f"Watsonx JSON Decode Error: {exc}. Raw output: {text[:500]}")
                logger.error("Failed to parse model response as JSON. Raw: %s", text)
                raise ValueError(
                    f"Model did not return valid JSON. Parse error: {exc}. "
                    f"Raw response (first 500 chars): {text[:500]}"
                ) from exc

    @staticmethod
    def _sanitize_diagram_code(code: str) -> str:
        """Cleans up LLM-generated Mermaid syntax for Mermaid v11 compatibility.

        Common issues fixed:
        - Semicolons converted to newlines (more reliable in Mermaid v11).
        - Trailing semicolons removed.
        - Problematic characters stripped from bracket labels.
        - Ensures 'graph TD' declaration is on its own line.
        """
        if not code or not code.strip():
            return ""

        code = code.strip()

        # Convert semicolons to newlines for Mermaid v11 compatibility
        code = code.replace(";", "\n")

        # Clean up extra whitespace and blank lines
        lines = [line.strip() for line in code.split("\n") if line.strip()]

        # Remove problematic characters from bracket labels: [label text]
        cleaned_lines = []
        for line in lines:
            # Fix accidental |> in arrow labels to standard |
            line = re.sub(r'\|>(\s*[\w\[])', r'|\1', line)

            # Strip parentheses, colons, quotes from inside square bracket labels
            line = re.sub(
                r'\[([^\]]*)\]',
                lambda m: '[' + re.sub(r'[()":;\'`]', '', m.group(1)).strip() + ']',
                line,
            )
            cleaned_lines.append(line)

        result = "\n".join(cleaned_lines)
        return result

    # ------------------------------------------------------------------ #
    # Slide refinement
    # ------------------------------------------------------------------ #

    _REFINE_PROMPT = """\
You are a Senior Principal Engineer refining a single presentation slide.
You will receive the CURRENT slide as JSON and a user INSTRUCTION describing what should change.

CRITICAL INSTRUCTIONS:
1. TECHNICAL DEPTH: Maintain high technical depth, specific metrics, library names, bottlenecks, and architecture nuances. Do not abstract away or "dumb down" the content.
2. ADVANCED DIAGRAMS: If refining or generating a diagram in 'diagram_code':
   - Use subgraphs, descriptive arrow labels (e.g. `A -->|REST API| B`), and clear structure.
   - Use appropriate types (`graph TB`, `graph TD`, `sequenceDiagram`).
   - Ensure node IDs contain no spaces or special characters (e.g., `A[API Gateway]`).
   - If no diagram fits, return an empty string "".
3. FORMAT: You MUST return ONLY a single raw JSON object. Do NOT include markdown code formatting (like ```json or ```) or any conversational text.

JSON Schema per object:
{
  "title": "Specific, technical slide title",
  "bullet_points": ["Deep technical point 1", "Data-backed point 2", "Detailed point 3"],
  "theme_variant": "warm", // Choose from: warm, bold, clean, analytical
  "diagram_code": "graph TD; ... (or empty string)"
}

4. Apply the user's instruction faithfully while keeping the slide coherent and technically rigorous.
5. If the instruction does not mention the theme, keep the current theme.
6. If the instruction does not mention the diagram, keep the current diagram_code.

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

        refined = self._extract_and_parse_json(raw_text, expected_type=dict)

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
        # Sanitise diagram_code for Mermaid v11 compatibility
        if refined.get("diagram_code"):
            refined["diagram_code"] = self._sanitize_diagram_code(
                refined["diagram_code"]
            )

        return refined
