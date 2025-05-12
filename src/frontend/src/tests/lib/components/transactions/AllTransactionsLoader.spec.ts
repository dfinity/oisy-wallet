import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { BASE_SEPOLIA_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import * as icTransactionsServices from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import AllTransactionsLoader from '$lib/components/transactions/AllTransactionsLoader.svelte';
import type { AllTransactionUiWithCmp, Transaction } from '$lib/types/transaction';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactionsUi } from '$tests/mocks/eth-transactions.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

vi.mock('$icp/services/ic-transactions.services', () => ({
	loadNextIcTransactions: vi.fn()
}));

vi.mock('$sol/services/sol-transactions.services', () => ({
	loadNextSolTransactions: vi.fn()
}));

describe('AllTransactionsLoader', () => {
	let spyLoadNextIcTransactions: MockInstance;
	let spyLoadNextSolTransactions: MockInstance;

	const btcTransactions: AllTransactionUiWithCmp[] = [
		...createMockBtcTransactionsUi(3).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 100n + BigInt(index) },
			component: 'bitcoin' as const,
			token: BTC_MAINNET_TOKEN
		})),
		...createMockBtcTransactionsUi(4).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 200n + BigInt(index) },
			component: 'bitcoin' as const,
			token: BTC_TESTNET_TOKEN
		}))
	];

	const ethTransactions: AllTransactionUiWithCmp[] = [
		...createMockEthTransactionsUi(5).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 300 + index },
			component: 'ethereum' as const,
			token: ETHEREUM_TOKEN
		})),
		...createMockEthTransactionsUi(6).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 400 + index },
			component: 'ethereum' as const,
			token: BNB_MAINNET_TOKEN
		})),
		...createMockEthTransactionsUi(7).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 500 + index },
			component: 'ethereum' as const,
			token: BASE_SEPOLIA_ETH_TOKEN
		}))
	];

	const icTokens = [ICP_TOKEN];
	const icTransactions: AllTransactionUiWithCmp[] = [
		...createMockIcTransactionsUi(8).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 600n + BigInt(index) },
			component: 'ic' as const,
			token: ICP_TOKEN
		}))
	];

	const solTransactions: AllTransactionUiWithCmp[] = [
		...createMockSolTransactionsUi(10).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 700n + BigInt(index) },
			component: 'solana' as const,
			token: SOLANA_TOKEN
		})),
		...createMockSolTransactionsUi(11).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: 800n + BigInt(index) },
			component: 'solana' as const,
			token: SOLANA_DEVNET_TOKEN
		}))
	];

	const mockTransactions: AllTransactionUiWithCmp[] = [
		...btcTransactions,
		...ethTransactions,
		...icTransactions,
		...solTransactions
	];

	const props = { transactions: mockTransactions };

	beforeAll(() => {
		vi.clearAllMocks();

		mockAuthStore();

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		spyLoadNextIcTransactions = vi.spyOn(icTransactionsServices, 'loadNextIcTransactions');
		spyLoadNextSolTransactions = vi.spyOn(solTransactionsServices, 'loadNextSolTransactions');

		spyLoadNextIcTransactions.mockImplementationOnce(
			async ({ signalEnd }: { signalEnd: () => void }) => {
				signalEnd();
				return await Promise.resolve();
			}
		);

		spyLoadNextSolTransactions.mockImplementationOnce(
			async ({ signalEnd }: { signalEnd: () => void }) => {
				signalEnd();
				return await Promise.resolve();
			}
		);

		btcTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			btcTransactionsStore.reset(tokenId);
			btcTransactionsStore.append({
				tokenId,
				transactions: [{ data: transaction as BtcTransactionUi, certified: false }]
			});
		});

		ethTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			ethTransactionsStore.nullify(tokenId);
			ethTransactionsStore.add({
				tokenId,
				transactions: [transaction as Transaction]
			});
		});

		icTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			icTransactionsStore.reset(tokenId);
			icTransactionsStore.append({
				tokenId,
				transactions: [{ data: transaction as IcTransactionUi, certified: false }]
			});
		});

		solTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			solTransactionsStore.reset(tokenId);
			solTransactionsStore.append({
				tokenId,
				transactions: [{ data: transaction as SolTransactionUi, certified: false }]
			});
		});
	});

	it('should not load transactions if identity is nullish', () => {
		mockAuthStore(null);

		render(AllTransactionsLoader, { props });

		expect(spyLoadNextIcTransactions).not.toHaveBeenCalled();
		expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();
	});

	it('should not load transactions if transactions are empty', () => {
		render(AllTransactionsLoader, { props: { transactions: [] } });

		expect(spyLoadNextIcTransactions).not.toHaveBeenCalled();
		expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();
	});

	it('should not load transactions if there are not enabled tokens', () => {
		setupTestnetsStore('disabled');
		setupUserNetworksStore('allDisabled');

		render(AllTransactionsLoader, { props });

		expect(spyLoadNextIcTransactions).not.toHaveBeenCalled();
		expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();
	});

	describe('with IC tokens', () => {
		it('should load transactions if the timestamp is lower than the minimum', () => {
			render(AllTransactionsLoader, { props });

			expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);
		});
	});
});
