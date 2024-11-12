import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';
import { render } from '@testing-library/svelte';

describe('SkeletonCard', () => {
	it('renders a Card component', () => {
		const { getByTestId } = render(SkeletonCard);

		const skeleton = getByTestId('skeleton-card');
		expect(skeleton).toBeInTheDocument();
	});

	it('renders a Card component with a custom testId', () => {
		const { getByTestId } = render(SkeletonCard, { props: { testId: 'custom-skeleton-card' } });

		const skeleton = getByTestId('custom-skeleton-card');
		expect(skeleton).toBeInTheDocument();
	});
});
