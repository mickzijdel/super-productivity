import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { IS_ELECTRON } from '../app.constants';

/**
 * Service to fetch URL metadata (page titles) for link attachments.
 * Includes caching to avoid redundant requests.
 * Uses Electron main process for fetching when available (avoids CORS issues).
 */
@Injectable({
  providedIn: 'root',
})
export class UrlMetadataService {
  private _http = inject(HttpClient);
  private _cache = new Map<string, string>();
  private _pendingRequests = new Map<string, Promise<string>>();
  private _isElectron = IS_ELECTRON;

  /**
   * Fetches the page title for a given URL.
   * Returns the title on success, or the URL basename on failure.
   *
   * @param url The URL to fetch metadata for
   * @param fallbackTitle Fallback title if fetch fails (defaults to URL basename)
   * @returns Promise<string> The page title or fallback
   */
  async fetchTitle(url: string, fallbackTitle: string): Promise<string> {
    // Skip for file:// URLs (can't fetch)
    if (url.startsWith('file://')) {
      return fallbackTitle;
    }

    // Check cache first
    if (this._cache.has(url)) {
      return this._cache.get(url)!;
    }

    // Check if there's already a pending request for this URL
    if (this._pendingRequests.has(url)) {
      return this._pendingRequests.get(url)!;
    }

    // Create and store pending request promise
    const fetchPromise = (async () => {
      try {
        let title: string | null = null;

        // Use Electron main process if available (avoids CORS)
        if (this._isElectron && (window as any).ea?.fetchUrlMetadata) {
          const result = await (window as any).ea.fetchUrlMetadata(url);
          title = result.title;
        } else {
          // Fallback to browser fetch (subject to CORS)
          const html = await firstValueFrom(
            this._http.get(url, { responseType: 'text' }).pipe(
              timeout(5000),
              catchError((error: HttpErrorResponse) => {
                // CORS or network error - return null
                return of(null);
              }),
            ),
          );

          if (html) {
            title = this._extractTitle(html);
          }
        }

        const finalTitle = title || fallbackTitle;

        // Cache result
        this._cache.set(url, finalTitle);
        return finalTitle;
      } catch (_error) {
        // Timeout or other error - use fallback
        this._cache.set(url, fallbackTitle);
        return fallbackTitle;
      } finally {
        // Clean up pending request
        this._pendingRequests.delete(url);
      }
    })();

    // Store the promise so other callers can wait for it
    this._pendingRequests.set(url, fetchPromise);
    return fetchPromise;
  }

  /**
   * Extracts the page title from HTML content.
   * Tries <title> tag first, then OpenGraph og:title.
   */
  private _extractTitle(html: string): string | null {
    // Try <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    // Try OpenGraph og:title
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    );
    if (ogTitleMatch && ogTitleMatch[1]) {
      return ogTitleMatch[1].trim();
    }

    // Try OpenGraph og:title (reversed attribute order)
    const ogTitleMatch2 = html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
    );
    if (ogTitleMatch2 && ogTitleMatch2[1]) {
      return ogTitleMatch2[1].trim();
    }

    return null;
  }

  /**
   * Clears the metadata cache
   */
  clearCache(): void {
    this._cache.clear();
  }
}
