import FactBox from '$lib/components/ui/FactBox.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render, screen } from '@testing-library/svelte';

describe('FactBox', () => {
	it('renders icon, title, and description when provided', () => {
		render(FactBox, {
			props: {
				icon: createMockSnippet('icon'),
				title: createMockSnippet('title'),
				description: createMockSnippet('description')
			}
		});

		expect(screen.getByTestId('icon')).toBeInTheDocument();
		expect(screen.getByTestId('title')).toBeInTheDocument();
		expect(screen.getByTestId('description')).toBeInTheDocument();
	});

	it('renders only icon when no title/description provided', () => {
		render(FactBox, {
			props: {
				icon: createMockSnippet('icon')
			}
		});

		expect(screen.getByTestId('icon')).toBeInTheDocument();
		expect(screen.queryByTestId('title')).toBeNull();
		expect(screen.queryByTestId('description')).toBeNull();
	});

	it('renders only title when provided alone', () => {
		render(FactBox, {
			props: {
				title: createMockSnippet('title')
			}
		});

		expect(screen.getByTestId('title')).toBeInTheDocument();
		expect(screen.queryByTestId('icon')).toBeNull();
		expect(screen.queryByTestId('description')).toBeNull();
	});

	it('renders only description when provided alone', () => {
		render(FactBox, {
			props: {
				description: createMockSnippet('description')
			}
		});

		expect(screen.getByTestId('description')).toBeInTheDocument();
		expect(screen.queryByTestId('icon')).toBeNull();
		expect(screen.queryByTestId('title')).toBeNull();
	});

	it('renders nothing when all props are missing', () => {
		const { container } = render(FactBox);

		// Only the wrapper div remains, no children
		expect(container.querySelector('[data-testid]')).toBeNull();
	});
});
