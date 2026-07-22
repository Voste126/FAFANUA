"""
storyteller/urls.py

URL routing for the storyteller app.

All routes are mounted under the /api/ prefix by the root URLconf
(FAFANUA_CORE_BACKEND/urls.py), making the effective public URLs:

    POST  /api/generate/
    GET   /api/history/
    GET   /api/history/<uuid:pk>/
"""

from django.urls import path

from .views import (
    GeneratePresentationView,
    PresentationDetailView,
    PresentationListView,
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
]
