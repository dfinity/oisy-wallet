import { BASE_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens-base/tokens.erc20.env';
import { BSC_BEP20_TOKENS } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bep20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { loadNextIcTransactions } from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import AllTransactionsScroll from '$lib/components/transactions/AllTransactionsScroll.svelte';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
import { nullishSignOut } from '$lib/services/auth.services';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	INTERSECTION_OBSERVER_ACTIVE_INTERVAL,
	IntersectionObserverActive,
	IntersectionObserverActiveInterval,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { createIcTransactionUiMockList } from '$tests/utils/transactions-stores.test-utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

vi.mock('$icp/services/ic-transactions.services', () => ({
	loadNextIcTransactions: vi.fn()
}));

describe('AllTransactionsScroll', () => {
	const mockToken1 = ICP_TOKEN;

	const mockToken2: IcrcCustomToken = {
		...mockValidIcToken,
		enabled: true
	};

	const mockToken3: IcrcCustomToken = {
		...mockValidIcCkToken,
		id: parseTokenId('STK'),
		ledgerCanisterId: 'mock-ledger-canister-id',
		name: 'other-dummy-token',
		enabled: true
	};

	const mockTokens = [mockToken1, mockToken2, mockToken3];

	const mockTransactions1: IcTransactionUi[] = createIcTransactionUiMockList(2);

	const mockTransactions2: IcTransactionUi[] = createIcTransactionUiMockList(3);

	const mockTransactions3: IcTransactionUi[] = createIcTransactionUiMockList(5);

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});

		mockAuthStore();

		mockTokens.forEach(({ id }) => icTransactionsStore.reset(id));

		icTransactionsStore.append({
			tokenId: mockToken1.id,
			transactions: mockTransactions1.map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});
		icTransactionsStore.append({
			tokenId: mockToken2.id,
			transactions: mockTransactions2.map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});
		icTransactionsStore.append({
			tokenId: mockToken3.id,
			transactions: mockTransactions3.map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});

		vi.spyOn(enabledNetworkTokens, 'subscribe').mockImplementation((fn) => {
			fn(mockTokens);
			return () => {};
		});
	});

	afterEach(() => (global.IntersectionObserver = IntersectionObserverPassive));

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	describe('when the infinite scroll is triggered', () => {
		it('should load next transactions for all tokens', () => {
			render(AllTransactionsScroll);

			expect(loadNextIcTransactions).toHaveBeenCalledTimes(mockTokens.length);

			mockTokens.forEach((token, index) => {
				const transactions = get(icTransactionsStore)?.[token.id] ?? [];
				const lastId = transactions[transactions.length - 1].data.id;

				expect(loadNextIcTransactions).toHaveBeenNthCalledWith(index + 1, {
					lastId,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should not load next transactions if identity is nullish', () => {
			mockAuthStore(null);

			render(AllTransactionsScroll);

			expect(loadNextIcTransactions).not.toHaveBeenCalled();

			expect(nullishSignOut).toHaveBeenCalledOnce();
		});

		it('should not load next transactions if the token is not supported', () => {
			vi.spyOn(enabledNetworkTokens, 'subscribe').mockImplementation((fn) => {
				fn([
					...SUPPORTED_BITCOIN_TOKENS,
					...SUPPORTED_ETHEREUM_TOKENS,
					...SUPPORTED_EVM_TOKENS,
					...SUPPORTED_SOLANA_TOKENS,
					...ERC20_TWIN_TOKENS,
					...BASE_ERC20_TOKENS,
					...BSC_BEP20_TOKENS
				]);
				return () => {};
			});

			render(AllTransactionsScroll);

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is nullish', () => {
			icTransactionsStore.reset(mockTokens[0].id);

			render(AllTransactionsScroll);

			expect(loadNextIcTransactions).toHaveBeenCalledTimes(mockTokens.length - 1);

			mockTokens.slice(1).forEach((token, index) => {
				const transactions = get(icTransactionsStore)?.[token.id] ?? [];
				const lastId = transactions[transactions.length - 1].data.id;

				expect(loadNextIcTransactions).toHaveBeenNthCalledWith(index + 1, {
					lastId,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should not load next transactions if the transactions store is empty', () => {
			icTransactionsStore.reset(mockTokens[0].id);
			icTransactionsStore.prepend({ tokenId: mockTokens[0].id, transactions: [] });

			render(AllTransactionsScroll);

			expect(loadNextIcTransactions).toHaveBeenCalledTimes(mockTokens.length - 1);

			mockTokens.slice(1).forEach((token, index) => {
				const transactions = get(icTransactionsStore)?.[token.id] ?? [];
				const lastId = transactions[transactions.length - 1].data.id;

				expect(loadNextIcTransactions).toHaveBeenNthCalledWith(index + 1, {
					lastId,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should not ignore errors for single token', () => {
			vi.mocked(loadNextIcTransactions).mockRejectedValueOnce(
				new Error('Error loading transactions')
			);

			render(AllTransactionsScroll);

			expect(loadNextIcTransactions).toHaveBeenCalledTimes(mockTokens.length);

			mockTokens.forEach((token, index) => {
				const transactions = get(icTransactionsStore)?.[token.id] ?? [];
				const lastId = transactions[transactions.length - 1].data.id;

				expect(loadNextIcTransactions).toHaveBeenNthCalledWith(index + 1, {
					lastId,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should not load next transactions if there are no more transactions', async () => {
			Object.defineProperty(window, 'IntersectionObserver', {
				writable: true,
				configurable: true,
				value: IntersectionObserverActiveInterval
			});

			const interval = INTERSECTION_OBSERVER_ACTIVE_INTERVAL;

			vi.useFakeTimers();

			vi.mocked(loadNextIcTransactions).mockImplementationOnce(
				async ({ signalEnd }: { signalEnd: () => void }) => {
					signalEnd();
					return await Promise.resolve();
				}
			);

			render(AllTransactionsScroll);

			await vi.advanceTimersByTimeAsync(interval + 1000);

			expect(loadNextIcTransactions).toHaveBeenCalledTimes(mockTokens.length);

			mockTokens.forEach((token, index) => {
				const transactions = get(icTransactionsStore)?.[token.id] ?? [];
				const lastId = transactions[transactions.length - 1].data.id;

				expect(loadNextIcTransactions).toHaveBeenNthCalledWith(index + 1, {
					lastId,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});

			await vi.advanceTimersByTimeAsync(interval * 2);

			const expectedTokens = [...mockTokens, ...mockTokens.slice(1)];

			expect(loadNextIcTransactions).toHaveBeenCalledTimes(expectedTokens.length);

			expectedTokens.forEach((token, index) => {
				const transactions = get(icTransactionsStore)?.[token.id] ?? [];
				const lastId = transactions[transactions.length - 1].data.id;

				expect(loadNextIcTransactions).toHaveBeenNthCalledWith(index + 1, {
					lastId,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});

			vi.useRealTimers();
		});
	});
});
