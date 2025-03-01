import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import AllTransactionsSkeletons from '$lib/components/transactions/AllTransactionsSkeletons.svelte';
import { render } from '@testing-library/svelte';

describe('AllTransactionsSkeletons', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		btcTransactionsStore.reset();

		ethTransactionsStore.reset();

		icTransactionsStore.reset();
	});

	it('should render the skeleton with loading true when stores are empty', () => {
		const { getByTestId } = render(AllTransactionsSkeletons, {
			props: {
				testIdPrefix: 'skeleton-card'
			}
		});

		Array.from({ length: 5 }).forEach((_, i) => {
			const skeleton = getByTestId(`skeleton-card-${i}`);
			expect(skeleton).toBeInTheDocument();
		});
	});
});
