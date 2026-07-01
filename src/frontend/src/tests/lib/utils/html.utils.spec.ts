import { nextElementId, sanitize } from '$lib/utils/html.utils';

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

		it('should preserve target blank links with noopener rel', () => {
			const result = sanitize('<a href="https://oisy.com" target="_blank">OISY</a>');
			const link = parseHtml(result).querySelector('a');

			expect(link?.getAttribute('href')).toBe('https://oisy.com');
			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('rel')).toBe('noopener');
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

	describe('nextElementId', () => {
		it('should increment counters independently by prefix', () => {
			expect(nextElementId('html-utils-spec-')).toBe('html-utils-spec-1');
			expect(nextElementId('html-utils-spec-')).toBe('html-utils-spec-2');
			expect(nextElementId('html-utils-other-spec-')).toBe('html-utils-other-spec-1');
			expect(nextElementId('html-utils-spec-')).toBe('html-utils-spec-3');
		});
	});
});
