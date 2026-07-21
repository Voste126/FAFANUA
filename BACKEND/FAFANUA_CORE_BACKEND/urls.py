"""
URL configuration for FAFANUA_CORE_BACKEND project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""

from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

# ---------------------------------------------------------------------------
# Swagger / OpenAPI schema view
# ---------------------------------------------------------------------------
schema_view = get_schema_view(
    openapi.Info(
        title="Fafanua API",
        default_version="v1",
        description=(
            "API for generating technical presentation slides via IBM watsonx. "
            "POST dense technical text to /api/generate/ and receive a structured "
            "JSON slide deck in return."
        ),
        contact=openapi.Contact(email="steveaustine18@gmail.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # ---- Storyteller API endpoints ----
    path("api/", include("storyteller.urls")),

    # ---- Swagger / OpenAPI documentation ----
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path(
        "",
        schema_view.with_ui("redoc", cache_timeout=0),
        name="schema-redoc",
    ),
]
