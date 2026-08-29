import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import EthTransactionsScroll from '$eth/components/transactions/EthTransactionsScroll.svelte';
import * as erc20UserTransactionsServices from '$eth/services/erc20-user-transactions.services';
import * as ethUserTransactionsServices from '$eth/services/eth-user-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { token } from '$lib/stores/token.store';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

describe('EthTransactionsScroll', () => {
	const mockToken = BASE_ETH_TOKEN;

	// Descending block numbers: the oldest entry is the one the next page continues from.
	const mockTransactions: Transaction[] = createMockEthTransactions(3).map(
		(transaction, index) => ({
			...transaction,
			blockNumber: 300 - index * 100
		})
	);

	const oldestLoadedBlockNumber = 100;

	let loadNextSpy: MockInstance;
	let loadNextErc20Spy: MockInstance;

	const setTransactions = ({ tokenId }: { tokenId: TokenId }) => {
		ethTransactionsStore.set({
			tokenId,
			transactions: mockTransactions.map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});
	};

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		ethTransactionsStore.reinitialize();

		token.set(mockToken);

		loadNextSpy = vi
			.spyOn(ethUserTransactionsServices, 'loadNextEthUserTransactions')
			.mockResolvedValue({ hasMore: true });

		loadNextErc20Spy = vi
			.spyOn(erc20UserTransactionsServices, 'loadNextErc20UserTransactions')
			.mockResolvedValue({ hasMore: true });

		setTransactions({ tokenId: mockToken.id });
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	it('should ask for the page below the oldest transaction on screen', () => {
		render(EthTransactionsScroll, { token: mockToken, children: mockSnippet });

		expect(loadNextSpy).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				transactionTokenId: { EvmNative: BASE_NETWORK.chainId },
				tokenId: mockToken.id,
				networkId: mockToken.network.id,
				oldestLoadedBlockNumber
			})
		);
	});

	it('should pass the stored backend cursor', () => {
		ethUserTransactionsServices.setEthBackendPaginationCursor({
			tokenId: mockToken.id,
			nextStart: 77n
		});

		render(EthTransactionsScroll, { token: mockToken, children: mockSnippet });

		expect(loadNextSpy).toHaveBeenCalledWith(expect.objectContaining({ cursor: 77n }));

		ethUserTransactionsServices.setEthBackendPaginationCursor({
			tokenId: mockToken.id,
			nextStart: undefined
		});
	});

	it('should not load anything while no transaction is on screen', () => {
		ethTransactionsStore.reinitialize();

		render(EthTransactionsScroll, { token: mockToken, children: mockSnippet });

		expect(loadNextSpy).not.toHaveBeenCalled();
	});

	it('should page an ERC20 token through its own loader', () => {
		token.set(USDC_TOKEN);

		setTransactions({ tokenId: USDC_TOKEN.id });

		render(EthTransactionsScroll, { token: USDC_TOKEN, children: mockSnippet });

		expect(loadNextSpy).not.toHaveBeenCalled();

		expect(loadNextErc20Spy).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				transactionTokenId: { Erc20: [USDC_TOKEN.address, USDC_TOKEN.network.chainId] },
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: USDC_TOKEN.network.id,
				oldestLoadedBlockNumber
			})
		);
	});

	it('should not load anything for a token whose history is not the chain history', () => {
		// ERC-721 history comes from `tokennfttx`, which neither of these paths queries.
		token.set(AZUKI_ELEMENTAL_BEANS_TOKEN);

		setTransactions({ tokenId: AZUKI_ELEMENTAL_BEANS_TOKEN.id });

		render(EthTransactionsScroll, { token: AZUKI_ELEMENTAL_BEANS_TOKEN, children: mockSnippet });

		expect(loadNextSpy).not.toHaveBeenCalled();
		expect(loadNextErc20Spy).not.toHaveBeenCalled();
	});
});
