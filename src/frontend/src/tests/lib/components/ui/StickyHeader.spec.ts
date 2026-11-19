import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('StickyHeader', () => {
	const props = {
		header: createMockSnippet('sticky-header-row'),
		children: createMockSnippet('sticky-header-content')
	};

	it('pins to the top of the window', () => {
		const { getByTestId } = render(StickyHeader, { props });

		expect(getByTestId('sticky-header-row').parentElement).toHaveClass('sticky', 'top-0');
	});

	// Between 768 and 1088 px the app header's band covers the top 80 px once the page scrolls;
	// a section header pinned at the very top would sit entirely under it.
	it('pins below the app header band where there is one, without its own top padding', () => {
		const { getByTestId } = render(StickyHeader, { props });

		expect(getByTestId('sticky-header-row').parentElement).toHaveClass(
			'header-band:top-20',
			'header-band:pt-0'
		);
	});
});
