import LoaderWithOverlay from '$lib/components/ui/LoaderWithOverlay.svelte';
import { render } from '@testing-library/svelte';

describe('LoaderWithOverlay', () => {
	it('renders with default structure', () => {
		const { getByRole, getByTestId } = render(LoaderWithOverlay, {
			props: {
				testId: 'avatar-loader',
				ariaLabel: 'Loading avatar...'
			}
		});

		const overlay = getByRole('status');

		expect(overlay).toBeInTheDocument();
		expect(overlay).toHaveAttribute('aria-label', 'Loading avatar...');
		expect(getByTestId('avatar-loader')).toBe(overlay);
		expect(getByTestId('spinner')).toBeInTheDocument();
	});

	it('applies custom styleClass if provided', () => {
		const { container } = render(LoaderWithOverlay, {
			props: {
				styleClass: 'custom-class'
			}
		});

		const div = container.querySelector('.avatar-spinner-overlay');

		expect(div?.classList.contains('custom-class')).toBeTruthy();
	});
});
