"""
storyteller/urls.py

URL routing for the storyteller app.

All routes are mounted under the /api/ prefix by the root URLconf
(FAFANUA_CORE_BACKEND/urls.py), making the effective public URL:

    POST  /api/generate/
"""

from django.urls import path

from .views import GeneratePresentationView

app_name = "storyteller"

urlpatterns = [
    path(
        "generate/",
        GeneratePresentationView.as_view(),
        name="generate-presentation",
    ),
]
