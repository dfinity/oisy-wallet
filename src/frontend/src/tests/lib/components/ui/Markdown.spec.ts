import Markdown from '$lib/components/ui/Markdown.svelte';
import { render, waitFor } from '@testing-library/svelte';

const { markdownToHTMLMock } = vi.hoisted(() => ({ markdownToHTMLMock: vi.fn() }));

vi.mock('$lib/utils/markdown.utils', () => ({
	markdownToHTML: markdownToHTMLMock
}));

describe('Markdown', () => {
	beforeEach(() => {
		markdownToHTMLMock.mockReset();
	});

	it('shows a loader until the markdown is rendered', () => {
		markdownToHTMLMock.mockReturnValue(new Promise<string>(() => {}));

		const { container } = render(Markdown, { text: '# Title' });

		expect(container.querySelector('[data-tid="spinner"]')).toBeInTheDocument();
	});

	it('renders the transformed html', async () => {
		markdownToHTMLMock.mockResolvedValue('<h1>Title</h1>');

		const { container } = render(Markdown, { text: '# Title' });

		await waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('Title'));
	});

	it('falls back to the raw text when rendering fails', async () => {
		markdownToHTMLMock.mockRejectedValue(new Error('boom'));

		const { getByTestId } = render(Markdown, { text: 'raw text' });

		await waitFor(() => expect(getByTestId('markdown-text').textContent).toBe('raw text'));
	});

	it('ignores a superseded render so stale output cannot overwrite newer', async () => {
		let resolveFirst: (value: string) => void = () => {};
		markdownToHTMLMock
			.mockImplementationOnce(() => new Promise<string>((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce('<h1>second</h1>');

		const { container, rerender } = render(Markdown, { text: 'first' });
		await rerender({ text: 'second' });

		await waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('second'));

		// The earlier, now-superseded render resolves last; it must not overwrite 'second'.
		resolveFirst('<h1>first</h1>');
		await waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('second'));
	});
});
