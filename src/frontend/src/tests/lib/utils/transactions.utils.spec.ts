import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import type { BtcTransactionUi } from '$btc/types/btc';
import * as networkEnv from '$env/networks.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { PEPE_TOKEN, PEPE_TOKEN_ID } from '$env/tokens-erc20/tokens.pepe.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_MAINNET_TOKEN_ID,
	BTC_TESTNET_TOKEN,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens.btc.env';
import {
	ETHEREUM_TOKEN,
	ETHEREUM_TOKEN_ID,
	SEPOLIA_TOKEN,
	SEPOLIA_TOKEN_ID
} from '$env/tokens.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import type { EthTransactionType } from '$eth/types/eth-transaction';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { AllTransactionsUi, Transaction } from '$lib/types/transaction';
import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';

describe('transactions.utils', () => {
	describe('mapAllTransactionsUi', () => {
		const btcTokens = [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN];
		const ethTokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN];
		const tokens = [...btcTokens, ...ethTokens];

		const certified = false;

		const mockBtcMainnetTransactions: BtcTransactionUi[] = createMockBtcTransactionsUi(5);

		const mockBtcTestnetTransactions: BtcTransactionUi[] = createMockBtcTransactionsUi(3);

		const mockBtcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>> = {
			[BTC_MAINNET_TOKEN_ID]: mockBtcMainnetTransactions.map((data) => ({ data, certified })),
			[BTC_TESTNET_TOKEN_ID]: mockBtcTestnetTransactions.map((data) => ({ data, certified }))
		};

		const mockEthMainnetTransactions: Transaction[] = createMockEthTransactions(9);

		const mockSepoliaTransactions: Transaction[] = createMockEthTransactions(7);

		const mockErc20Transactions: Transaction[] = createMockEthTransactions(4);

		const mockEthTransactions: EthTransactionsData = {
			[ETHEREUM_TOKEN_ID]: mockEthMainnetTransactions,
			[SEPOLIA_TOKEN_ID]: mockSepoliaTransactions,
			[PEPE_TOKEN_ID]: mockErc20Transactions
		};

		const expectedBtcMainnetTransactions: AllTransactionsUi = [
			...mockBtcMainnetTransactions.map((transaction) => ({
				...transaction,
				component: BtcTransaction
			}))
		];

		const uiType = 'receive' as EthTransactionType;

		const expectedEthMainnetTransactions: AllTransactionsUi = [
			...mockEthMainnetTransactions.map((transaction) => ({
				...transaction,
				id: transaction.hash,
				uiType,
				component: EthTransaction
			}))
		];

		const expectedSepoliaTransactions: AllTransactionsUi = [
			...mockSepoliaTransactions.map((transaction) => ({
				...transaction,
				id: transaction.hash,
				uiType,
				component: EthTransaction
			}))
		];

		const expectedErc20Transactions: AllTransactionsUi = [
			...mockErc20Transactions.map((transaction) => ({
				...transaction,
				id: transaction.hash,
				uiType,
				component: EthTransaction
			}))
		];

		const expectedEthTransactions: AllTransactionsUi = [
			...expectedEthMainnetTransactions,
			...expectedSepoliaTransactions,
			...expectedErc20Transactions
		];

		const expectedTransactions: AllTransactionsUi = [
			...expectedBtcMainnetTransactions,
			...expectedEthTransactions
		];

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(networkEnv, 'SUPPORTED_ETHEREUM_NETWORKS_IDS', 'get').mockImplementation(() => [
				ETHEREUM_NETWORK_ID,
				SEPOLIA_NETWORK_ID
			]);
		});

		describe('BTC transactions', () => {
			const tokens = [...btcTokens];

			const rest = { $ethTransactions: {}, $ckEthMinterInfo: {}, $ethAddress: undefined };

			it('should map BTC mainnet transactions correctly', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					...rest
				});

				expect(result).toHaveLength(mockBtcMainnetTransactions.length);
				expect(result).toEqual(expectedBtcMainnetTransactions);
			});

			it('should return an empty array if the BTC transactions store is not initialized', () => {
				const result = mapAllTransactionsUi({ tokens, $btcTransactions: undefined, ...rest });

				expect(result).toEqual([]);
			});

			it('should return an empty array if there are no transactions for BTC mainnet', () => {
				const mockBtcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>> = {
					[BTC_TESTNET_TOKEN_ID]: mockBtcTestnetTransactions.map((data) => ({ data, certified }))
				};

				const result = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					...rest
				});

				expect(result).toEqual([]);
			});
		});

		describe('ETH transactions', () => {
			const tokens = [...ethTokens];

			const rest = { $btcTransactions: undefined, $ckEthMinterInfo: {}, $ethAddress: undefined };

			it('should map ETH transactions correctly', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$ethTransactions: mockEthTransactions,
					...rest
				});

				expect(result).toHaveLength(
					mockEthMainnetTransactions.length +
						mockSepoliaTransactions.length +
						mockErc20Transactions.length
				);
				expect(result).toEqual(expectedEthTransactions);
			});

			it('should return an empty array if the ETH transactions store is not initialized', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$ethTransactions: {},
					...rest
				});

				expect(result).toEqual([]);
			});

			it('should return an empty array if there are no transactions any of the tokens', () => {
				const tokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN];

				const mockEthTransactions: EthTransactionsData = {
					[PEPE_TOKEN_ID]: mockErc20Transactions
				};

				const result = mapAllTransactionsUi({
					tokens,
					$ethTransactions: mockEthTransactions,
					...rest
				});

				expect(result).toEqual([]);
			});

			it('should map correctly if there are no transactions for some of the tokens', () => {
				const mockEthTransactions: EthTransactionsData = {
					[PEPE_TOKEN_ID]: mockErc20Transactions
				};

				const result = mapAllTransactionsUi({
					tokens,
					$ethTransactions: mockEthTransactions,
					...rest
				});

				expect(result).toEqual(expectedErc20Transactions);
			});
		});

		describe('mixed transactions', () => {
			it('should map all transactions correctly', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					$ethTransactions: mockEthTransactions,
					$ckEthMinterInfo: {},
					$ethAddress: undefined
				});

				expect(result).toHaveLength(
					mockBtcMainnetTransactions.length +
						mockEthMainnetTransactions.length +
						mockSepoliaTransactions.length +
						mockErc20Transactions.length
				);

				expect(result).toEqual(expectedTransactions);
			});
		});
	});
});
