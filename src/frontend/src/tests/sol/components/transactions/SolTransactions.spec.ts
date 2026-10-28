import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { NO_TRANSACTIONS_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolTransactions from '$sol/components/transactions/SolTransactions.svelte';
import { loadOlderSolTokenTransactions } from '$sol/services/sol-history-pagers.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { solUnreadableTransactionsWarningStore } from '$sol/stores/sol-unreadable-transactions-warning.store';
import { solUnreadableTransactionsStore } from '$sol/stores/sol-unreadable-transactions.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$sol/services/sol-history-pagers.services', () => ({
	loadOlderSolTokenTransactions: vi.fn().mockResolvedValue({ success: false })
}));

describe('SolTransactions', () => {
	const warningText = replacePlaceholders(en.activity.warning.unsupported_sol_transactions, {
		$token_list: 'SOL'
	});

	const { signature } = mockSolSignatureResponse();

	const loadTransactions = () =>
		solTransactionsStore.set({
			tokenId: SOLANA_TOKEN_ID,
			transactions: [{ data: createMockSolTransactionUi('loaded-tx'), certified: false }]
		});

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		mockPage.reset();
		mockPage.mockToken(SOLANA_TOKEN);

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
		[SOLANA_TOKEN_ID, USDC_TOKEN.id].forEach((tokenId) =>
			solUnreadableTransactionsStore.reset(tokenId)
		);
		solUnreadableTransactionsWarningStore.reset();
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	// The worker's first page holds the network's newest transactions only: a token whose
	// transactions are all older gets an empty list, and only its own pager reaches them.
	it('should page the token history when the worker posted an empty list', () => {
		solTransactionsStore.set({ tokenId: SOLANA_TOKEN_ID, transactions: [] });

		const { getByTestId } = render(SolTransactions);

		expect(loadOlderSolTokenTransactions).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ token: SOLANA_TOKEN })
		);
		expect(getByTestId(NO_TRANSACTIONS_PLACEHOLDER)).toBeInTheDocument();
	});

	it('should show the transactions it holds, without the placeholder', () => {
		solTransactionsStore.set({
			tokenId: SOLANA_TOKEN_ID,
			transactions: [{ data: createMockSolTransactionUi('held-tx'), certified: false }]
		});

		const { queryByTestId } = render(SolTransactions);

		expect(queryByTestId(NO_TRANSACTIONS_PLACEHOLDER)).not.toBeInTheDocument();
	});

	it('should not page before the worker posted the list', () => {
		render(SolTransactions);

		expect(loadOlderSolTokenTransactions).not.toHaveBeenCalled();
	});

	it('should not warn while the history of the token misses nothing', () => {
		loadTransactions();

		const { queryByText } = render(SolTransactions);

		expect(queryByText(warningText)).not.toBeInTheDocument();
	});

	it('should warn above the list about transactions it misses', () => {
		loadTransactions();
		solUnreadableTransactionsStore.add({ tokenId: SOLANA_TOKEN_ID, signatures: [signature] });

		const { getByText } = render(SolTransactions);

		expect(getByText(warningText)).toBeInTheDocument();
	});

	// The transactions it misses may be all the token has.
	it('should warn over an empty list too', () => {
		solTransactionsStore.set({ tokenId: SOLANA_TOKEN_ID, transactions: [] });
		solUnreadableTransactionsStore.add({ tokenId: SOLANA_TOKEN_ID, signatures: [signature] });

		const { getByText } = render(SolTransactions);

		expect(getByText(warningText)).toBeInTheDocument();
	});

	it('should not warn about transactions another token misses', () => {
		loadTransactions();
		solUnreadableTransactionsStore.add({ tokenId: USDC_TOKEN.id, signatures: [signature] });

		const { queryByText } = render(SolTransactions);

		expect(queryByText(warningText)).not.toBeInTheDocument();
	});

	it('should share the dismissal with the Activity page', async () => {
		loadTransactions();
		solUnreadableTransactionsStore.add({ tokenId: SOLANA_TOKEN_ID, signatures: [signature] });

		const { container, queryByText } = render(SolTransactions);

		const warningBox = container.querySelector('.bg-warning-light');
		assertNonNullish(warningBox);

		const closeButton = warningBox.querySelector('button');
		assertNonNullish(closeButton);

		await fireEvent.click(closeButton);

		await waitFor(() => expect(queryByText(warningText)).not.toBeInTheDocument());

		// The same store the Activity page filters on.
		expect(get(solUnreadableTransactionsWarningStore)).toStrictEqual([`${signature}:`]);
	});
});
