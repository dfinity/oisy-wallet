import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';
import { render } from '@testing-library/svelte';

describe('SkeletonCard', () => {
	it('renders a Card component', () => {
		const { getByTestId } = render(SkeletonCard, { props: { testId: 'skeleton-card' } });

		const skeleton = getByTestId('skeleton-card');

		expect(skeleton).toBeInTheDocument();
	});
});
