import IconSwap from '$lib/components/ui/IconSwap.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('IconSwap', () => {
	const iconTestId = 'mock-icon';
	const swappedIconTestId = 'mock-swapped-icon';

	const props = {
		icon: createMockSnippet(iconTestId),
		swappedIcon: createMockSnippet(swappedIconTestId)
	};

	it.each([false, true])('should keep both icons mounted when swapped is %s', (swapped) => {
		const { getByTestId } = render(IconSwap, { props: { ...props, swapped } });

		expect(getByTestId(iconTestId)).toBeInTheDocument();
		expect(getByTestId(swappedIconTestId)).toBeInTheDocument();
	});

	it('should show the icon and hide the swapped icon when not swapped', () => {
		const { getByTestId } = render(IconSwap, { props: { ...props, swapped: false } });

		const iconLayer = getByTestId(iconTestId).parentElement;
		const swappedIconLayer = getByTestId(swappedIconTestId).parentElement;

		expect(iconLayer).not.toHaveClass('out');
		expect(iconLayer).toHaveAttribute('aria-hidden', 'false');
		expect(swappedIconLayer).toHaveClass('out');
		expect(swappedIconLayer).toHaveAttribute('aria-hidden', 'true');
	});

	it('should show the swapped icon and hide the icon when swapped', () => {
		const { getByTestId } = render(IconSwap, { props: { ...props, swapped: true } });

		const iconLayer = getByTestId(iconTestId).parentElement;
		const swappedIconLayer = getByTestId(swappedIconTestId).parentElement;

		expect(iconLayer).toHaveClass('out');
		expect(iconLayer).toHaveAttribute('aria-hidden', 'true');
		expect(swappedIconLayer).not.toHaveClass('out');
		expect(swappedIconLayer).toHaveAttribute('aria-hidden', 'false');
	});
});
