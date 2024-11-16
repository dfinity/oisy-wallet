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
	ICP_TOKEN,
	ICP_TOKEN_ID,
	SEPOLIA_TOKEN,
	SEPOLIA_TOKEN_ID
} from '$env/tokens.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import type { EthTransactionType } from '$eth/types/eth-transaction';
import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { AllTransactionsUi, AnyTransactionUi, Transaction } from '$lib/types/transaction';
import { mapAllTransactionsUi, sortTransactions } from '$lib/utils/transactions.utils';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';

describe('transactions.utils', () => {
	describe('mapAllTransactionsUi', () => {
		const btcTokens = [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN];
		const ethTokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN];
		const icTokens = [ICP_TOKEN];
		const tokens = [...btcTokens, ...ethTokens, ...icTokens];

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

		const mockIcTransactionsUi: IcTransactionUi[] = createMockIcTransactionsUi(7);

		const mockIcTransactions: CertifiedStoreData<TransactionsData<IcTransactionUi>> = {
			[ICP_TOKEN_ID]: mockIcTransactionsUi.map((data) => ({ data, certified }))
		};

		const expectedBtcMainnetTransactions: AllTransactionsUi = [
			...mockBtcMainnetTransactions.map((transaction) => ({
				...transaction,
				token: BTC_MAINNET_TOKEN,
				component: BtcTransaction
			}))
		];

		const uiType = 'receive' as EthTransactionType;

		const expectedEthMainnetTransactions: AllTransactionsUi = [
			...mockEthMainnetTransactions.map((transaction) => ({
				...transaction,
				id: transaction.hash,
				uiType,
				token: ETHEREUM_TOKEN,
				component: EthTransaction
			}))
		];

		const expectedSepoliaTransactions: AllTransactionsUi = [
			...mockSepoliaTransactions.map((transaction) => ({
				...transaction,
				id: transaction.hash,
				uiType,
				token: SEPOLIA_TOKEN,
				component: EthTransaction
			}))
		];

		const expectedErc20Transactions: AllTransactionsUi = [
			...mockErc20Transactions.map((transaction) => ({
				...transaction,
				id: transaction.hash,
				uiType,
				token: PEPE_TOKEN,
				component: EthTransaction
			}))
		];

		const expectedEthTransactions: AllTransactionsUi = [
			...expectedEthMainnetTransactions,
			...expectedSepoliaTransactions,
			...expectedErc20Transactions
		];

		const expectedIcTransactions: AllTransactionsUi = [
			...mockIcTransactionsUi.map((transaction) => ({
				...transaction,
				token: ICP_TOKEN,
				component: IcTransaction
			}))
		];

		const expectedTransactions: AllTransactionsUi = [
			...expectedBtcMainnetTransactions,
			...expectedEthTransactions,
			...expectedIcTransactions
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

			const rest = {
				$ethTransactions: {},
				$ckEthMinterInfo: {},
				$ethAddress: undefined,
				$icTransactions: {},
				$btcStatuses: undefined
			};

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

			const rest = {
				$btcTransactions: undefined,
				$ckEthMinterInfo: {},
				$ethAddress: undefined,
				$icTransactions: {},
				$btcStatuses: undefined
			};

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

		describe('IC transactions', () => {
			const tokens = [...icTokens];

			const rest = {
				$btcTransactions: undefined,
				$ckEthMinterInfo: {},
				$ethTransactions: {},
				$ethAddress: undefined,
				$btcStatuses: undefined
			};

			it('should map IC transactions correctly', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$icTransactions: mockIcTransactions,
					...rest
				});

				expect(result).toHaveLength(mockIcTransactionsUi.length);
				expect(result).toEqual(expectedIcTransactions);
			});

			it('should return an empty array if the IC transactions store is not initialized', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$icTransactions: {},
					...rest
				});

				expect(result).toEqual([]);
			});
		});

		describe('mixed transactions', () => {
			it('should map all transactions correctly', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					$ethTransactions: mockEthTransactions,
					$ckEthMinterInfo: {},
					$ethAddress: undefined,
					$icTransactions: mockIcTransactions,
					$btcStatuses: undefined
				});

				expect(result).toHaveLength(
					mockBtcMainnetTransactions.length +
						mockEthMainnetTransactions.length +
						mockSepoliaTransactions.length +
						mockErc20Transactions.length +
						mockIcTransactionsUi.length
				);

				expect(result).toEqual(expectedTransactions);
			});
		});
	});

	describe('sortTransactions', () => {
		const transaction1 = { timestamp: 1 } as AnyTransactionUi;
		const transaction2 = { timestamp: 2 } as AnyTransactionUi;
		const transaction3 = { timestamp: 3 } as AnyTransactionUi;
		const transactionWithNullTimestamp = { timestamp: undefined } as AnyTransactionUi;

		it('should sort transactions in descending order by timestamp', () => {
			const result = [transaction2, transaction1, transaction3].sort((a, b) =>
				sortTransactions({ transactionA: a, transactionB: b })
			);
			expect(result).toEqual([transaction3, transaction2, transaction1]);
		});

		it('should sort transactions with nullish timestamps first', () => {
			const result = [transaction1, transactionWithNullTimestamp, transaction2].sort((a, b) =>
				sortTransactions({ transactionA: a, transactionB: b })
			);
			expect(result).toEqual([transactionWithNullTimestamp, transaction2, transaction1]);
		});
	});
});
