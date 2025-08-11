import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { NO_TRANSACTIONS_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('IcTransactions', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		mockPage.mockToken(ICP_TOKEN);

		icTransactionsStore.reset(ICP_TOKEN_ID);
	});

	it('should render no transactions placeholder when the transactions are empty', () => {
		icTransactionsStore.append({
			tokenId: ICP_TOKEN_ID,
			transactions: []
		});

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId(NO_TRANSACTIONS_PLACEHOLDER)).not.toBeNull();
	});

	it('should render no transactions placeholder when the transactions are null', () => {
		icTransactionsStore.nullify(ICP_TOKEN_ID);

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId('ic-no-index-placeholder')).not.toBeNull();
	});
});
