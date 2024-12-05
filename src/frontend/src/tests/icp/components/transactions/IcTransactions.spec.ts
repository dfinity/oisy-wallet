import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { token } from '$lib/stores/token.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('IcTransactions', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		token.set(ICP_TOKEN);

		icTransactionsStore.reset(ICP_TOKEN_ID);
	});

	it('should render no transactions placeholder', () => {
		icTransactionsStore.append({
			tokenId: ICP_TOKEN_ID,
			transactions: []
		});

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId('no-transactions-placeholder')).not.toBeNull();
	});

	it('should render no transactions placeholder', () => {
		icTransactionsStore.nullify(ICP_TOKEN_ID);

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId('ic-no-index-placeholder')).not.toBeNull();
	});
});
