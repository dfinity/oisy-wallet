import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { ACTIVITY_TRANSACTIONS_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import { token } from '$lib/stores/token.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('IcTransactions', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		token.set(ICP_TOKEN);

		icTransactionsStore.reset(ICP_TOKEN_ID);
	});

	it('should render no transactions placeholder when the transactions are empty', () => {
		icTransactionsStore.append({
			tokenId: ICP_TOKEN_ID,
			transactions: []
		});

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId(ACTIVITY_TRANSACTIONS_PLACEHOLDER)).not.toBeNull();
	});

	it('should render no transactions placeholder when the transactions are null', () => {
		icTransactionsStore.nullify(ICP_TOKEN_ID);

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId('ic-no-index-placeholder')).not.toBeNull();
	});
});
