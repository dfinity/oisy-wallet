import Spinner from '$lib/components/ui/Spinner.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { render, screen } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

describe('Spinner.svelte', () => {
	it('renders the smooth visor Trace outline instead of a circular spinner', () => {
		const { container } = render(Spinner);
		const svg = container.querySelector('svg');
		assertNonNullish(svg);

		expect(svg).toHaveAttribute('viewBox', '0 0 46 40');
		expect(svg.querySelector('circle')).toBeNull();

		const paths = svg.querySelectorAll('path');

		expect(paths).toHaveLength(2);
		expect(paths[0]).toHaveAttribute('opacity', '0.2');
		expect(paths[1]).toHaveAttribute('pathLength', '100');
		expect(paths[1]).toHaveAttribute('stroke-dasharray', '25 75');
		expect(paths[1]).toHaveAttribute('stroke-linecap', 'round');
		expect(paths[1].getAttribute('d')).toBe(paths[0].getAttribute('d'));
	});

	it('keeps the essential progress trace animated under reduced motion', () => {
		const source = readFileSync(
			join(process.cwd(), 'src/frontend/src/lib/components/ui/Spinner.svelte'),
			'utf8'
		);
		const styles = source.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1];
		assertNonNullish(styles);

		const animations: string[] = [];
		postcss.parse(styles).walkRules('.trace', (rule) => {
			rule.walkDecls('animation', ({ value }) => {
				animations.push(value);
			});
		});

		expect(animations).toEqual(['spinner-trace 1200ms linear infinite']);
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

	it('reserves an inline footprint when requested', () => {
		render(Spinner, { props: { inline: true, size: '48px' } });
		const wrapper = screen.getByTestId('spinner').closest('span');

		expect(wrapper).toHaveClass('inline');
		expect(wrapper).toHaveAttribute('style', '--spinner-size: 48px;');
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
