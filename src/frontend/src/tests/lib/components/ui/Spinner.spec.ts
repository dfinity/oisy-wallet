import Spinner from '$lib/components/ui/Spinner.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { render, screen } from '@testing-library/svelte';

describe('Spinner.svelte', () => {
	it('renders the spinner SVG', () => {
		const { container } = render(Spinner);

		const svg = container.querySelector('svg');
		assertNonNullish(svg);

		expect(svg).toBeInTheDocument();

		const circle = svg.querySelector('circle');

		expect(circle).not.toBeNull();
		expect(circle?.getAttribute('cx')).toBe('50%');
		expect(circle?.getAttribute('cy')).toBe('50%');
	});

	it('sets the default size to 16px', () => {
		render(Spinner);
		const wrapper = screen.getByTestId('spinner').closest('span');

		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute('style')).toContain('--spinner-size: 16px');
	});

	it('applies a custom size when passed as prop', () => {
		render(Spinner, { props: { size: '32px' } });
		const wrapper = screen.getByTestId('spinner').closest('span');

		expect(wrapper?.getAttribute('style')).toContain('--spinner-size: 32px');
	});

	it('inherits color and sets correct accessibility attributes', () => {
		render(Spinner);

		const svg = screen.getByTestId('spinner');

		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect(svg).toHaveAttribute('focusable', 'false');
		expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
	});

	it('has correct CSS classes applied', () => {
		render(Spinner);
		const svg = screen.getByTestId('spinner');

		expect(svg.classList.contains('spinner')).toBeTruthy();
	});
});
