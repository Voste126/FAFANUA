"""
storyteller/serializers.py

DRF serializers for the Presentation and Slide models.

SlideSerializer serialises a single slide; PresentationSerializer includes
a nested, read-only list of slides so the API always returns the full
presentation structure in one response.
"""

from rest_framework import serializers

from .models import Presentation, Slide


class SlideSerializer(serializers.ModelSerializer):
    """Serializer for the Slide model.

    Exposes all slide fields except the raw ``presentation`` FK id
    (which is redundant when nested inside a PresentationSerializer).
    """

    class Meta:
        model = Slide
        fields = [
            "id",
            "slide_order",
            "title",
            "bullet_points",
            "theme_variant",
            "diagram_code",
        ]
        read_only_fields = fields


class PresentationSerializer(serializers.ModelSerializer):
    """Serializer for the Presentation model with nested slides.

    The ``slides`` field is populated automatically via the
    ``related_name='slides'`` reverse relation and is read-only.
    """

    slides = SlideSerializer(many=True, read_only=True)

    class Meta:
        model = Presentation
        fields = [
            "id",
            "original_text",
            "slides",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
