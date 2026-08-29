import { loadNextBtcTransactionsByOldest } from '$btc/services/btc-transactions.services';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { loadNextEthTransactionsByOldest } from '$eth/services/eth-transactions.services';
import { loadNextIcTransactionsByOldest } from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { loadOlderTransactionsFor } from '$lib/services/transactions-pagination.services';
import type { Token } from '$lib/types/token';
import { loadNextSolTransactionsByOldest } from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$icp/services/ic-transactions.services', () => ({
	loadNextIcTransactionsByOldest: vi.fn()
}));

vi.mock('$sol/services/sol-transactions.services', () => ({
	loadNextSolTransactionsByOldest: vi.fn()
}));

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadNextEthTransactionsByOldest: vi.fn()
}));

vi.mock('$btc/services/btc-transactions.services', () => ({
	loadNextBtcTransactionsByOldest: vi.fn()
}));

describe('transactions-pagination.services', () => {
	const signalEnd = () => undefined;

	beforeEach(() => {
		vi.clearAllMocks();

		icTransactionsStore.reset(ICP_TOKEN.id);
		solTransactionsStore.reset(SOLANA_TOKEN.id);
	});

	describe('loadOlderTransactionsFor', () => {
		it.each([
			{ chain: 'ICP', token: ICP_TOKEN },
			{ chain: 'Solana', token: SOLANA_TOKEN },
			{ chain: 'Ethereum', token: ETHEREUM_TOKEN },
			{ chain: 'an EVM chain', token: BASE_ETH_TOKEN },
			{ chain: 'an ERC20 token', token: USDC_TOKEN },
			{ chain: 'Bitcoin', token: BTC_MAINNET_TOKEN }
		])('should resolve a loader for $chain', ({ token }) => {
			expect(loadOlderTransactionsFor(token as Token)).toBeDefined();
		});

		it('should resolve nothing for a chain without pagination', () => {
			const token = {
				...ICP_TOKEN,
				network: { ...ICP_TOKEN.network, id: Symbol('unsupported') }
			} as unknown as Token;

			expect(loadOlderTransactionsFor(token)).toBeUndefined();
		});

		it('should route Bitcoin straight to its own loader', async () => {
			const loadOlder = loadOlderTransactionsFor(BTC_MAINNET_TOKEN);

			await loadOlder?.({ token: BTC_MAINNET_TOKEN, identity: mockIdentity, signalEnd });

			expect(loadNextBtcTransactionsByOldest).toHaveBeenCalledExactlyOnceWith({
				token: BTC_MAINNET_TOKEN,
				identity: mockIdentity,
				signalEnd
			});
		});

		it('should route EVM chains straight to the ETH loader', async () => {
			const loadOlder = loadOlderTransactionsFor(BASE_ETH_TOKEN);

			await loadOlder?.({ token: BASE_ETH_TOKEN, identity: mockIdentity, signalEnd });

			expect(loadNextEthTransactionsByOldest).toHaveBeenCalledExactlyOnceWith({
				token: BASE_ETH_TOKEN,
				identity: mockIdentity,
				signalEnd
			});
		});

		it('should hand the ICP loader the caller principal', async () => {
			const loadOlder = loadOlderTransactionsFor(ICP_TOKEN);

			await loadOlder?.({
				token: ICP_TOKEN,
				identity: mockIdentity,
				minTimestamp: 123,
				signalEnd
			});

			// The loader reads its own store now, so the dispatcher only supplies what it cannot.
			expect(loadNextIcTransactionsByOldest).toHaveBeenCalledExactlyOnceWith({
				token: ICP_TOKEN,
				identity: mockIdentity,
				owner: mockIdentity.getPrincipal(),
				maxResults: WALLET_PAGINATION,
				minTimestamp: 123,
				signalEnd
			});
		});

		it('should not call the ICP loader without an identity', async () => {
			const loadOlder = loadOlderTransactionsFor(ICP_TOKEN);

			const result = await loadOlder?.({ token: ICP_TOKEN, identity: undefined, signalEnd });

			expect(result).toEqual({ success: false });
			expect(loadNextIcTransactionsByOldest).not.toHaveBeenCalled();
		});

		it('should pass the Solana loader straight through', async () => {
			const loadOlder = loadOlderTransactionsFor(SOLANA_TOKEN);

			await loadOlder?.({ token: SOLANA_TOKEN, identity: mockIdentity, signalEnd });

			expect(loadNextSolTransactionsByOldest).toHaveBeenCalledExactlyOnceWith({
				token: SOLANA_TOKEN,
				identity: mockIdentity,
				signalEnd
			});
		});

		it('should omit the floor when the caller wants a page regardless', async () => {
			const loadOlder = loadOlderTransactionsFor(SOLANA_TOKEN);

			await loadOlder?.({ token: SOLANA_TOKEN, identity: mockIdentity, signalEnd });

			expect(loadNextSolTransactionsByOldest).toHaveBeenCalledExactlyOnceWith(
				expect.not.objectContaining({ minTimestamp: expect.anything() })
			);
		});
	});
});
