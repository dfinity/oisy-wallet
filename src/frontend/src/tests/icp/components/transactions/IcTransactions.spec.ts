import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import { NO_TRANSACTIONS_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { render } from '@testing-library/svelte';

describe('IcTransactions', () => {
	beforeAll(() => {
		// A populated list mounts the infinite scroll.
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		mockPage.mockToken(ICP_TOKEN);

		icTransactionsStore.reset(ICP_TOKEN_ID);
		icTransactionsStatusStore.reset();
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	const failTransactionsSync = (times: number) =>
		Array.from({ length: times }).forEach(() => icTransactionsStatusStore.fail(ICP_TOKEN_ID));

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

	it('should render the unavailable Index canister placeholder while the Index canister is failing', () => {
		// A failing Index canister no longer nullifies the store — the placeholder has to come from
		// the failure signal, not from the store being empty.
		icTransactionsStore.append({ tokenId: ICP_TOKEN_ID, transactions: [] });
		failTransactionsSync(IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD);

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId('ic-no-index-placeholder')).not.toBeNull();
	});

	it('should render the generic placeholder below the failure threshold', () => {
		icTransactionsStore.append({ tokenId: ICP_TOKEN_ID, transactions: [] });
		failTransactionsSync(IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD - 1);

		const { getByTestId } = render(IcTransactions);

		expect(getByTestId(NO_TRANSACTIONS_PLACEHOLDER)).not.toBeNull();
	});

	it('should keep showing the transactions already loaded while the Index canister is failing', () => {
		icTransactionsStore.append({
			tokenId: ICP_TOKEN_ID,
			transactions: [createCertifiedIcTransactionUiMock('tx1')]
		});
		failTransactionsSync(IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD);

		const { queryByTestId } = render(IcTransactions);

		expect(queryByTestId('ic-no-index-placeholder')).toBeNull();
	});
});
