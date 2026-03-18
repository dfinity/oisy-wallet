import ScrollableBar from '$lib/components/ui/ScrollableBar.svelte';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('ScrollableBar', () => {
	const createChildSnippet = ({ testId, text }: { testId: string; text: string }) =>
		createRawSnippet(() => ({
			render: () => `<button data-tid="${testId}">${text}</button>`
		}));

	it('should render children content', () => {
		const { getByTestId } = render(ScrollableBar, {
			props: { children: createChildSnippet({ testId: 'child-item', text: 'Item 1' }) }
		});

		expect(getByTestId('child-item')).toBeInTheDocument();
	});

	it('should have the scrollable-bar class on the container', () => {
		const { container } = render(ScrollableBar, {
			props: { children: createChildSnippet({ testId: 'item', text: 'Test' }) }
		});

		const scrollableDiv = container.querySelector('.scrollable-bar');

		expect(scrollableDiv).toBeInTheDocument();
	});

	it('should have flex layout classes', () => {
		const { container } = render(ScrollableBar, {
			props: { children: createChildSnippet({ testId: 'item', text: 'Test' }) }
		});

		const scrollableDiv = container.querySelector('.scrollable-bar');

		expect(scrollableDiv?.classList.contains('flex')).toBeTruthy();
		expect(scrollableDiv?.classList.contains('gap-2')).toBeTruthy();
	});

	it('should have responsive classes for desktop wrapping', () => {
		const { container } = render(ScrollableBar, {
			props: { children: createChildSnippet({ testId: 'item', text: 'Test' }) }
		});

		const scrollableDiv = container.querySelector('.scrollable-bar');

		expect(scrollableDiv?.classList.contains('md:flex-wrap')).toBeTruthy();
		expect(scrollableDiv?.classList.contains('md:overflow-visible')).toBeTruthy();
	});

	it('should render children inside the scrollable container', () => {
		const { container } = render(ScrollableBar, {
			props: { children: createChildSnippet({ testId: 'nested-btn', text: 'Nested' }) }
		});

		const button = container.querySelector('.scrollable-bar button');

		expect(button).toBeInTheDocument();
		expect(button?.textContent).toBe('Nested');
	});
});
