import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// URL regex matching URLs with protocol (http, https, file) or www prefix
// Limit URL length to 2000 chars to prevent ReDoS attacks
const URL_REGEX = /(?:(?:https?|file):\/\/\S{1,2000}(?=\s|$)|www\.\S{1,2000}(?=\s|$))/gi;

// Markdown link regex: [title](url)
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Pipe that renders URLs and markdown links as clickable <a> tags.
 * Returns SafeHtml suitable for use with [innerHTML].
 * All user-supplied content is HTML-escaped before insertion to prevent XSS.
 * Dangerous URL schemes (javascript:, data:, vbscript:) are rejected.
 */
@Pipe({
  name: 'renderLinks',
  standalone: true,
  pure: true,
})
export class RenderLinksPipe implements PipeTransform {
  private _sanitizer = inject(DomSanitizer);

  transform(text: string, renderLinks: boolean = true): SafeHtml {
    if (!text) {
      return '';
    }

    // When link rendering is disabled, return escaped plain text as SafeHtml
    if (!renderLinks) {
      return this._sanitizer.bypassSecurityTrustHtml(this._escapeHtml(text));
    }

    // Fast pre-check: skip expensive regex for plain-text tasks
    const hasUrlHint = text.includes('://') || text.includes('www.');
    const hasMarkdownHint = text.includes('](');
    if (!hasUrlHint && !hasMarkdownHint) {
      return this._sanitizer.bypassSecurityTrustHtml(this._escapeHtml(text));
    }

    let htmlWithLinks = text;
    let hasMarkdown = false;
    let hasUrls = false;

    // First, handle markdown links: [title](url)
    MARKDOWN_LINK_REGEX.lastIndex = 0;
    hasMarkdown = MARKDOWN_LINK_REGEX.test(text);
    if (hasMarkdown) {
      MARKDOWN_LINK_REGEX.lastIndex = 0;
      htmlWithLinks = htmlWithLinks.replace(MARKDOWN_LINK_REGEX, (_match, title, url) => {
        if (!this._isUrlSchemeSafe(url)) {
          return this._escapeHtml(title);
        }
        const href = this._normalizeHref(url);
        const escapedHref = this._escapeHtml(href);
        const escapedTitle = this._escapeHtml(title);
        return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedTitle}</a>`;
      });
    }

    // Then, handle plain URLs (avoiding re-processing existing <a> tags)
    URL_REGEX.lastIndex = 0;
    hasUrls = URL_REGEX.test(htmlWithLinks);
    if (hasUrls) {
      const anchorRegex = /<a\b[^>]*>.*?<\/a>/gs;
      const parts: Array<{ text: string; isAnchor: boolean }> = [];
      let lastIndex = 0;
      let anchorMatch: RegExpExecArray | null;

      while ((anchorMatch = anchorRegex.exec(htmlWithLinks)) !== null) {
        if (anchorMatch.index > lastIndex) {
          parts.push({
            text: htmlWithLinks.slice(lastIndex, anchorMatch.index),
            isAnchor: false,
          });
        }
        parts.push({ text: anchorMatch[0], isAnchor: true });
        lastIndex = anchorRegex.lastIndex;
      }
      if (lastIndex < htmlWithLinks.length) {
        parts.push({ text: htmlWithLinks.slice(lastIndex), isAnchor: false });
      }

      htmlWithLinks = parts
        .map((part) => {
          if (part.isAnchor) {
            return part.text;
          }
          URL_REGEX.lastIndex = 0;
          return part.text.replace(URL_REGEX, (url) => {
            const cleanUrl = url.replace(/[.,;!?]+$/, '');
            if (!this._isUrlSchemeSafe(cleanUrl)) {
              return this._escapeHtml(cleanUrl);
            }
            const href = this._normalizeHref(cleanUrl);
            const escapedHref = this._escapeHtml(href);
            const escapedDisplay = this._escapeHtml(cleanUrl);
            return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedDisplay}</a>`;
          });
        })
        .join('');
    }

    if (!hasMarkdown && !hasUrls) {
      return this._sanitizer.bypassSecurityTrustHtml(this._escapeHtml(text));
    }

    return this._sanitizer.bypassSecurityTrustHtml(htmlWithLinks);
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private _isUrlSchemeSafe(url: string): boolean {
    const lowerUrl = url.trim().toLowerCase();
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:'];
    if (dangerousSchemes.some((scheme) => lowerUrl.startsWith(scheme))) {
      return false;
    }
    if (
      lowerUrl.startsWith('http://') ||
      lowerUrl.startsWith('https://') ||
      lowerUrl.startsWith('file://') ||
      lowerUrl.startsWith('//')
    ) {
      return true;
    }
    if (!lowerUrl.includes('://')) {
      return true;
    }
    return false;
  }

  private _normalizeHref(url: string): string {
    if (url.match(/^(?:https?|file):\/\//)) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    return `http://${url}`;
  }
}
