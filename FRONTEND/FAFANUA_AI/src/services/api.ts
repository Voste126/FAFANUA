/**
 * src/services/api.ts
 *
 * Axios-based API client for the Fafanua Django backend.
 * All network calls are centralised here to keep components free of fetch logic.
 */

import axios, { AxiosError } from 'axios';
import type { Slide, ApiError } from '../types/slide';

/** Axios instance pre-configured for the Django REST API. */
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120_000, // 2 min — Granite inference can be slow on cold start
});

/**
 * Sends technical content to the Django /api/generate/ endpoint and returns
 * a structured array of presentation slides.
 *
 * @param content - Dense technical text to transform into slides.
 * @returns Promise resolving to an array of {@link Slide} objects.
 * @throws An {@link ApiError}-shaped object if the server returns a non-2xx status.
 */
export async function generatePresentation(content: string): Promise<Slide[]> {
  try {
    const response = await apiClient.post<Slide[]>('generate/', {
      technical_content: content,
    });
    return response.data;
  } catch (err) {
    const axiosErr = err as AxiosError<ApiError>;
    // Re-throw with the server's detail message if available, otherwise rethrow raw.
    if (axiosErr.response?.data?.detail) {
      throw new Error(axiosErr.response.data.detail);
    }
    throw new Error(
      axiosErr.message || 'An unexpected error occurred. Is the Django server running?'
    );
  }
}
