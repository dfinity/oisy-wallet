import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
import { render } from '@testing-library/svelte';

describe('TransactionsSkeletons', () => {
	it('renders SkeletonCards when loading is true', () => {
		const { getByTestId } = render(TransactionsSkeletons, {
			props: { loading: true, testIdPrefix: 'skeleton-card' }
		});

		Array.from({ length: 5 }).forEach((_, i) => {
			const skeleton = getByTestId(`skeleton-card-${i}`);
			expect(skeleton).toBeInTheDocument();
		});
	});

	it('renders slot content when loading is false', () => {
		const { getByTestId } = render(TransactionsSkeletons, {
			props: { loading: false, testIdPrefix: 'skeleton-card' }
		});

		Array.from({ length: 5 }).forEach((_, i) => {
			expect(() => getByTestId(`skeleton-card-${i}`)).toThrow();
		});
	});
});
