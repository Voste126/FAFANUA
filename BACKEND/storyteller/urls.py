"""
storyteller/urls.py

URL routing for the storyteller app.

All routes are mounted under the /api/ prefix by the root URLconf
(FAFANUA_CORE_BACKEND/urls.py), making the effective public URLs:

    POST   /api/generate/
    GET    /api/history/
    GET    /api/history/<uuid:pk>/
    PATCH  /api/history/<uuid:presentation_pk>/slides/<int:slide_id>/refine/
"""

from django.urls import path

from .views import (
    GeneratePresentationView,
    PresentationDetailView,
    PresentationExportView,
    PresentationListView,
    PresentationPPTXExportView,
    SlideRefineView,
)

app_name = "storyteller"

urlpatterns = [
    path(
        "generate/",
        GeneratePresentationView.as_view(),
        name="generate-presentation",
    ),
    path(
        "history/",
        PresentationListView.as_view(),
        name="presentation-list",
    ),
    path(
        "history/<uuid:pk>/",
        PresentationDetailView.as_view(),
        name="presentation-detail",
    ),
    path(
        "history/<uuid:pk>/export/",
        PresentationExportView.as_view(),
        name="presentation-export",
    ),
    path(
        "history/<uuid:pk>/export/pptx/",
        PresentationPPTXExportView.as_view(),
        name="presentation-export-pptx",
    ),
    path(
        "history/<uuid:presentation_pk>/slides/<int:slide_id>/refine/",
        SlideRefineView.as_view(),
        name="slide-refine",
    ),
]
