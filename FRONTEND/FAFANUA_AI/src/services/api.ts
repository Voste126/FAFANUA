/**
 * src/services/api.ts
 *
 * Axios-based API client for the Fafanua Django backend.
 * All network calls are centralised here to keep components free of fetch logic.
 */

import axios, { AxiosError } from 'axios';
import type { Presentation, Slide, ApiError } from '../types/slide';

/** Axios instance pre-configured for the Django REST API. */
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120_000, // 2 min — Granite inference can be slow on cold start
});

/**
 * Helper to extract a human-readable error message from an Axios error.
 */
function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  if (axiosErr.response?.data?.detail) {
    return axiosErr.response.data.detail;
  }
  return (
    axiosErr.message ||
    'An unexpected error occurred. Is the Django server running?'
  );
}

/**
 * Sends technical content to the Django /api/generate/ endpoint and returns
 * a persisted Presentation object containing structured slides.
 *
 * @param content - Dense technical text to transform into slides.
 * @returns Promise resolving to a {@link Presentation} object.
 * @throws An error with the server's detail message if the request fails.
 */
export async function generatePresentation(
  content: string,
): Promise<Presentation> {
  try {
    const response = await apiClient.post<Presentation>('generate/', {
      technical_content: content,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches the full list of previously generated presentations,
 * ordered newest-first.
 *
 * @returns Promise resolving to an array of {@link Presentation} objects.
 */
export async function fetchHistory(): Promise<Presentation[]> {
  try {
    const response = await apiClient.get<Presentation[]>('history/');
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches a single presentation by its UUID, including all nested slides.
 *
 * @param id - The UUID of the presentation to retrieve.
 * @returns Promise resolving to a {@link Presentation} object.
 */
export async function fetchPresentation(id: string): Promise<Presentation> {
  try {
    const response = await apiClient.get<Presentation>(`history/${id}/`);
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Sends a refinement instruction for a single slide to the AI backend.
 * Uses PATCH to update only the targeted slide, leaving the rest untouched.
 *
 * @param presentationId - UUID of the parent presentation.
 * @param slideId        - Database ID of the slide to refine.
 * @param instruction    - Natural-language refinement instruction from the user.
 * @returns Promise resolving to the updated {@link Slide} object.
 */
export async function refineSlide(
  presentationId: string,
  slideId: number,
  instruction: string,
): Promise<Slide> {
  try {
    const response = await apiClient.patch<Slide>(
      `history/${presentationId}/slides/${slideId}/refine/`,
      { instruction },
    );
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Downloads a presentation as a PDF file.
 * The backend returns binary PDF data, so we use `responseType: 'blob'`
 * and trigger a browser download via a temporary object URL.
 *
 * @param presentationId - UUID of the presentation to export.
 */
export async function exportPresentation(
  presentationId: string,
): Promise<void> {
  try {
    const response = await apiClient.get(`history/${presentationId}/export/`, {
      responseType: 'blob',
    });

    // Create a temporary URL for the blob and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fafanua_presentation_${presentationId}.pdf`;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // When responseType is 'blob', error responses are also blobs —
    // attempt to parse JSON from the blob for a meaningful message.
    const axiosErr = err as AxiosError;
    if (axiosErr.response?.data instanceof Blob) {
      try {
        const text = await axiosErr.response.data.text();
        const json = JSON.parse(text) as ApiError;
        if (json.detail) throw new Error(json.detail);
      } catch (parseErr) {
        // If we couldn't parse JSON, fall through to the generic handler
        if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
          throw parseErr;
        }
      }
    }
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Downloads a presentation as an editable PowerPoint (.pptx) file.
 * The backend returns binary PPTX data, so we use `responseType: 'blob'`
 * and trigger a browser download via a temporary object URL.
 *
 * @param presentationId - UUID of the presentation to export.
 */
export async function exportToPPTX(presentationId: string): Promise<void> {
  try {
    const response = await apiClient.get(`history/${presentationId}/export/pptx/`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fafanua_presentation_${presentationId}.pptx`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response?.data instanceof Blob) {
      try {
        const text = await axiosErr.response.data.text();
        const json = JSON.parse(text) as ApiError;
        if (json.detail) throw new Error(json.detail);
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
          throw parseErr;
        }
      }
    }
    throw new Error(extractErrorMessage(err));
  }
}

