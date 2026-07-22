"""
storyteller/models.py

Database models for persisting generated presentations and their slides.

A Presentation stores the original technical text that was submitted, and
each Slide holds one slide's structured content (title, bullets, theme).
"""

import uuid

from django.db import models


class Presentation(models.Model):
    """A single presentation generation request and its metadata.

    Attributes:
        id: Universally unique identifier (auto-generated).
        original_text: The raw technical content submitted by the user.
        created_at: Timestamp set automatically when the record is created.
        updated_at: Timestamp updated automatically on every save.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the presentation.",
    )
    original_text = models.TextField(
        help_text="The original technical content submitted for slide generation.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the presentation was generated.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the last update to this record.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Presentation"
        verbose_name_plural = "Presentations"

    def __str__(self) -> str:
        preview = self.original_text[:80]
        suffix = "…" if len(self.original_text) > 80 else ""
        return f'Presentation {self.id} — "{preview}{suffix}"'


class Slide(models.Model):
    """A single slide belonging to a Presentation.

    Attributes:
        presentation: The parent Presentation this slide belongs to.
        slide_order: Zero-based ordering index within the presentation.
        title: Concise, punchy slide heading.
        bullet_points: A JSON array of audience-friendly bullet-point strings.
        theme_variant: Visual theme — one of "warm", "bold", or "clean".
    """

    presentation = models.ForeignKey(
        Presentation,
        on_delete=models.CASCADE,
        related_name="slides",
        help_text="The presentation this slide belongs to.",
    )
    slide_order = models.IntegerField(
        help_text="Zero-based order of the slide within the presentation.",
    )
    title = models.CharField(
        max_length=255,
        help_text="Concise slide title.",
    )
    bullet_points = models.JSONField(
        default=list,
        help_text="JSON array of bullet-point strings.",
    )
    theme_variant = models.CharField(
        max_length=10,
        help_text='Visual theme: "warm", "bold", or "clean".',
    )

    class Meta:
        ordering = ["slide_order"]
        verbose_name = "Slide"
        verbose_name_plural = "Slides"
        unique_together = [("presentation", "slide_order")]

    def __str__(self) -> str:
        return (
            f"Slide {self.slide_order} of {self.presentation_id}: "
            f'"{self.title}"'
        )
