import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
import { render } from '@testing-library/svelte';

describe('SkeletonCards', () => {
	it('renders a number of SkeletonCard components', () => {
		const { getByTestId } = render(SkeletonCards, { props: { rows: 5 } });

		Array.from({ length: 5 }).forEach((_, i) => {
			const skeleton = getByTestId(`skeleton-card-${i}`);
			expect(skeleton).toBeInTheDocument();
		});
	});

	it('renders a number of SkeletonCard components with a custom testId', () => {
		const { getByTestId } = render(SkeletonCards, {
			props: { rows: 3, testIdPrefix: 'custom-skeleton-card' }
		});

		Array.from({ length: 3 }).forEach((_, i) => {
			const skeleton = getByTestId(`custom-skeleton-card-${i}`);
			expect(skeleton).toBeInTheDocument();
		});
	});
});
