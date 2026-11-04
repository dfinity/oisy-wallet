import { escapeHtml, nextElementId, sanitize, sanitizeUntrusted } from '$lib/utils/html.utils';

const parseHtml = (html: string): HTMLElement => {
	const container = document.createElement('div');
	container.innerHTML = html;

	return container;
};

describe('html.utils', () => {
	describe('sanitize', () => {
		it('should remove scripts and unsafe attributes', () => {
			const result = sanitize(
				'<p>Hello<img src="x" onerror="alert(1)"><script>alert(2)</script></p>'
			);
			const container = parseHtml(result);

			expect(container.querySelector('script')).toBeNull();
			expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
			expect(container.textContent).toBe('Hello');
		});

		it('should preserve target blank links with noopener noreferrer rel', () => {
			const result = sanitize('<a href="https://oisy.com" target="_blank">OISY</a>');
			const link = parseHtml(result).querySelector('a');

			expect(link?.getAttribute('href')).toBe('https://oisy.com');
			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
			expect(link?.getAttribute('data-target')).toBeNull();
		});

		it('should preserve an existing noreferrer rel for target blank links', () => {
			const result = sanitize(
				'<a href="https://oisy.com" target="_blank" rel="noreferrer external">OISY</a>'
			);
			const link = parseHtml(result).querySelector('a');

			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('rel')).toBe('noreferrer external');
		});
	});

	describe('sanitizeUntrusted', () => {
		it('should keep the markup markdown can produce', () => {
			const result = sanitizeUntrusted(
				'<h1>Title</h1><p><strong>Amount:</strong> 1 ICP</p><ul><li>item</li></ul>'
			);
			const container = parseHtml(result);

			expect(container.querySelector('h1')?.textContent).toBe('Title');
			expect(container.querySelector('strong')?.textContent).toBe('Amount:');
			expect(container.querySelector('li')?.textContent).toBe('item');
		});

		it('should preserve target blank links with noopener noreferrer rel', () => {
			const result = sanitizeUntrusted('<a href="https://oisy.com" target="_blank">OISY</a>');
			const link = parseHtml(result).querySelector('a');

			expect(link?.getAttribute('href')).toBe('https://oisy.com');
			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
			expect(link?.getAttribute('data-target')).toBeNull();
		});

		it('should remove buttons and other form controls', () => {
			const result = sanitizeUntrusted(
				'<button style=zoom:99>Approve</button><input type="submit"><select></select><textarea></textarea>'
			);
			const container = parseHtml(result);

			expect(container.querySelector('button')).toBeNull();
			expect(container.querySelector('input')).toBeNull();
			expect(container.querySelector('select')).toBeNull();
			expect(container.querySelector('textarea')).toBeNull();
		});

		it('should remove style tags and inline styles', () => {
			const result = sanitizeUntrusted('<style>p{display:none}</style><p style="zoom:99">Fee</p>');
			const container = parseHtml(result);

			expect(container.querySelector('style')).toBeNull();
			expect(container.querySelector('p')?.getAttribute('style')).toBeNull();
			expect(result).not.toContain('display:none');
		});

		it('should remove elements carrying event handlers', () => {
			const result = sanitizeUntrusted('<p onclick="alert(1)">Fee</p><img src="x" onerror="1">');
			const container = parseHtml(result);

			expect(container.querySelector('p')?.getAttribute('onclick')).toBeNull();
			expect(container.querySelector('img')).toBeNull();
		});

		it('should not let the default sanitizer configuration leak into a subsequent call', () => {
			sanitizeUntrusted('<button>Approve</button>');

			const result = sanitize('<button>Approve</button>');

			expect(parseHtml(result).querySelector('button')).not.toBeNull();
		});
	});

	describe('escapeHtml', () => {
		it('should escape every character that has a meaning in HTML', () => {
			expect(escapeHtml(`<a href="x" title='y'>A & B</a>`)).toBe(
				'&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;A &amp; B&lt;/a&gt;'
			);
		});

		it('should leave a text without such characters unchanged', () => {
			expect(escapeHtml('Bored Ape Yacht Club')).toBe('Bored Ape Yacht Club');
		});

		it('should keep a value as plain text once substituted into markup and sanitized', () => {
			const value =
				'</b><div style="position:fixed"><h1>Title</h1><img src="https://example.com/a.png"><a href="https://example.com">link</a></div><b>';

			const container = parseHtml(sanitize(`Hide <b>${escapeHtml(value)}</b>?`));

			expect(container.querySelector('b')?.textContent).toBe(value);
			expect(container.querySelectorAll('*')).toHaveLength(1);
		});
	});

	describe('nextElementId', () => {
		it('should increment counters independently by prefix', () => {
			expect(nextElementId('html-utils-spec-')).toBe('html-utils-spec-1');
			expect(nextElementId('html-utils-spec-')).toBe('html-utils-spec-2');
			expect(nextElementId('html-utils-other-spec-')).toBe('html-utils-other-spec-1');
			expect(nextElementId('html-utils-spec-')).toBe('html-utils-spec-3');
		});
	});
});
