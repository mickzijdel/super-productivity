import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskTitleComponent } from './task-title.component';
import { TranslateModule } from '@ngx-translate/core';

describe('TaskTitleComponent', () => {
  let component: TaskTitleComponent;
  let fixture: ComponentFixture<TaskTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskTitleComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('displayHtml - XSS Protection', () => {
    it('should sanitize HTML in markdown link titles', () => {
      // This should NOT execute script - Angular sanitizer strips unsafe HTML
      component.tmpValue.set('Task [<img src=x onerror=alert(1)>](https://example.com)');
      const html = component.displayHtml();
      const htmlString = html.toString();

      // Angular's sanitizer strips the onerror attribute for safety
      expect(htmlString).not.toContain('onerror');
      expect(htmlString).toContain('<img src="x">'); // Safe img tag remains
    });

    it('should sanitize HTML in plain URL titles', () => {
      component.tmpValue.set('Task https://evil.com/<script>alert(1)</script>');
      const html = component.displayHtml();
      const htmlString = html.toString();

      // Angular's sanitizer completely removes <script> tags
      expect(htmlString).not.toContain('<script>');
      expect(htmlString).not.toContain('alert(1)');
      // The sanitized URL should still be present
      expect(htmlString).toContain('https://evil.com/');
    });

    it('should escape quote characters in href attributes', () => {
      // This should NOT break out of href attribute
      component.tmpValue.set('Task [link](https://evil.com/"onmouseover="alert(1))');
      const html = component.displayHtml();
      const htmlString = html.toString();

      // Should escape quotes in href - Angular uses &#34; (numeric entity) for quotes
      // The text "onmouseover=" can exist but must be inside escaped quotes so it doesn't execute
      expect(htmlString).toContain('&#34;onmouseover=&#34;');
      expect(htmlString).toContain(
        'href="https://evil.com/&#34;onmouseover=&#34;alert(1"',
      );
    });

    it('should escape ampersands in URLs', () => {
      component.tmpValue.set('Task https://example.com?a=1&b=2');
      const html = component.displayHtml();
      const htmlString = html.toString();

      // Ampersands in href should be escaped
      expect(htmlString).toContain('&amp;');
    });

    it('should handle plain text without URLs safely', () => {
      component.tmpValue.set('Just plain text with <html> tags');
      const result = component.displayHtml();

      // Plain text should be returned as-is (no HTML tags present)
      expect(result).toBe('Just plain text with <html> tags');
    });

    it('should escape markdown link URL with JavaScript protocol', () => {
      component.tmpValue.set('Task [Click me](javascript:alert(1))');
      const html = component.displayHtml();
      const htmlString = html.toString();

      // Should NOT have javascript: protocol in href
      // Note: We might want to strip javascript: URLs entirely
      expect(htmlString).not.toContain('href="javascript:');
    });
  });
});
