"""
storyteller/admin.py

Django admin configuration for the storyteller app.

Registers Presentation and Slide models with sensible defaults for
browsing generated content through the admin interface.
"""

from django.contrib import admin

from .models import Presentation, Slide


class SlideInline(admin.TabularInline):
    """Inline admin for Slide — displayed within the Presentation detail page."""

    model = Slide
    extra = 0
    ordering = ["slide_order"]
    readonly_fields = ["slide_order", "title", "bullet_points", "theme_variant"]


@admin.register(Presentation)
class PresentationAdmin(admin.ModelAdmin):
    """Admin configuration for Presentation."""

    list_display = ["id", "short_text", "slide_count", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["original_text"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [SlideInline]

    @admin.display(description="Original Text (preview)")
    def short_text(self, obj: Presentation) -> str:
        return obj.original_text[:120] + ("…" if len(obj.original_text) > 120 else "")

    @admin.display(description="Slides")
    def slide_count(self, obj: Presentation) -> int:
        return obj.slides.count()


@admin.register(Slide)
class SlideAdmin(admin.ModelAdmin):
    """Admin configuration for Slide."""

    list_display = ["id", "presentation", "slide_order", "title", "theme_variant"]
    list_filter = ["theme_variant"]
    search_fields = ["title"]
    readonly_fields = ["presentation", "slide_order", "title", "bullet_points", "theme_variant"]
