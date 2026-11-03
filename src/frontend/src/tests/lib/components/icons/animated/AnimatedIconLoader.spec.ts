import AnimatedIconLoader from '$lib/components/icons/animated/AnimatedIconLoader.svelte';
import { render, screen } from '@testing-library/svelte';

describe('AnimatedIconLoader', () => {
	it('renders the shared visor Trace in the default 22px inline icon footprint', () => {
		render(AnimatedIconLoader);

		const svg = screen.getByTestId('spinner');

		expect(svg).toHaveAttribute('viewBox', '0 0 46 40');
		expect(svg.querySelectorAll('path')).toHaveLength(2);
		expect(svg.querySelector('.trace')).toHaveAttribute('stroke-dasharray', '25 75');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect(svg).toHaveAttribute('focusable', 'false');
		expect(svg.closest('span')).toHaveClass('inline');
		expect(svg.closest('span')).toHaveAttribute('style', '--spinner-size: 22px;');
	});

	it.each([
		{ size: '32', length: '32px' },
		{ size: '22.5', length: '22.5px' },
		{ size: '.5', length: '0.5px' },
		{ size: '+22', length: '22px' },
		{ size: '2.2e1', length: '22px' },
		{ size: '0', length: '0px' },
		{ size: '24px', length: '24px' },
		{ size: '1.5rem', length: '1.5rem' },
		{ size: '2em', length: '2em' },
		{ size: '50%', length: '50%' },
		{ size: 'calc(1rem + 6px)', length: 'calc(1rem + 6px)' },
		{ size: 'var(--icon-size)', length: 'var(--icon-size)' }
	])('preserves the $size icon footprint as $length', ({ size, length }) => {
		render(AnimatedIconLoader, { props: { size } });

		const wrapper = screen.getByTestId('spinner').closest('span');

		expect(wrapper).toHaveClass('inline');
		expect(wrapper).toHaveAttribute('style', `--spinner-size: ${length};`);
	});

	it('updates the inline footprint when the size prop changes', async () => {
		const { rerender } = render(AnimatedIconLoader, { props: { size: '32' } });

		await rerender({ size: '2rem' });

		expect(screen.getByTestId('spinner').closest('span')).toHaveAttribute(
			'style',
			'--spinner-size: 2rem;'
		);
	});
});
