import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { render, screen } from '@testing-library/svelte';

describe('LoaderSpinner', () => {
	it('keeps a centered overlay wrapper by default', () => {
		const { container } = render(LoaderSpinner);

		expect(container.firstElementChild).toHaveClass('overlay');
	});

	it.each([
		{ size: 'tiny' as const, length: '0.75rem' },
		{ size: 'small' as const, length: '1.5rem' },
		{ size: 'medium' as const, length: '30px' }
	])('keeps the $size inline footprint as a valid CSS length', ({ size, length }) => {
		render(LoaderSpinner, { props: { size, inline: true } });
		const wrapper = screen.getByTestId('spinner').closest('span');

		expect(wrapper).toHaveClass('inline');
		expect(wrapper?.getAttribute('style')).toContain(`--spinner-size: ${length};`);
	});

	it('uses the same smooth visor as Spinner', () => {
		const { container: spinner } = render(Spinner);
		const { container: loader } = render(LoaderSpinner);

		expect(loader.querySelectorAll('path')).toHaveLength(2);
		expect(loader.querySelector('path')?.getAttribute('d')).toBe(
			spinner.querySelector('path')?.getAttribute('d')
		);
	});
});
