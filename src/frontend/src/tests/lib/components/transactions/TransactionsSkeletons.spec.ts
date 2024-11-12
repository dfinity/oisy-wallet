import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
import { render } from '@testing-library/svelte';

describe('TransactionsSkeletons', () => {
	it('renders SkeletonCards when loading is true', () => {
		const { getByTestId } = render(TransactionsSkeletons, { props: { loading: true } });

		const skeleton = getByTestId('skeleton-cards');
		expect(skeleton).toBeInTheDocument();
	});

	it('renders slot content with fade transition when loading is false', () => {
		const { getByTestId, queryByTestId } = render(TransactionsSkeletons, {
			props: { loading: false }
		});
		const skeleton = queryByTestId('skeleton-cards');
		expect(skeleton).not.toBeInTheDocument();

		const content = getByTestId('slot-content');
		expect(content).toBeInTheDocument();
	});
});
