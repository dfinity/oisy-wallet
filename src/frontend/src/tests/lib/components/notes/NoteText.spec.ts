import NoteText from '$lib/components/notes/NoteText.svelte';
import { render } from '@testing-library/svelte';

describe('NoteText', () => {
	it('renders the first line as a bold title and the rest as the body', () => {
		const { container } = render(NoteText, {
			props: { note: 'This is a title\nline two\nline three' }
		});

		const title = container.querySelector('p.font-bold');
		const body = container.querySelector('p.whitespace-pre-wrap');

		expect(title?.textContent?.trim()).toBe('This is a title');
		expect(body?.textContent).toContain('line two');
		expect(body?.textContent).toContain('line three');
	});

	it('uses the first non-empty line as the title when the note starts with blank lines', () => {
		const { container } = render(NoteText, { props: { note: '\n\nTitle\nBody' } });

		expect(container.querySelector('p.font-bold')?.textContent?.trim()).toBe('Title');
		expect(container.querySelector('p.whitespace-pre-wrap')?.textContent?.trim()).toBe('Body');
	});

	it('renders no body paragraph for a single-line note', () => {
		const { container } = render(NoteText, { props: { note: 'just a title' } });

		expect(container.querySelector('p.font-bold')?.textContent?.trim()).toBe('just a title');
		expect(container.querySelector('p.whitespace-pre-wrap')).toBeNull();
	});

	it('turns an http(s) URL into a safe new-tab link in both title and body', () => {
		const { container } = render(NoteText, {
			props: { note: 'see https://oisy.com\nand https://internetcomputer.org' }
		});

		const links = container.querySelectorAll('a');

		expect(links).toHaveLength(2);

		links.forEach((link) => {
			expect(link.getAttribute('target')).toBe('_blank');
			expect(link.getAttribute('rel')).toBe('noopener noreferrer');
		});
	});

	it('does not linkify dangerous schemes', () => {
		const { container } = render(NoteText, { props: { note: 'click javascript:alert(1)' } });

		expect(container.querySelector('a')).toBeNull();
	});

	it('strips bidi control characters', () => {
		const { container } = render(NoteText, { props: { note: 'a‮b' } });

		expect(container.textContent).not.toContain('‮');
		expect(container.textContent).toContain('ab');
	});
});
