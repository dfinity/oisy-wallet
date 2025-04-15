import type { BtcTransactionUi } from '$btc/types/btc';
import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN, PEPE_TOKEN_ID } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { BONK_TOKEN, BONK_TOKEN_ID } from '$env/tokens/tokens-spl/tokens.bonk.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens/tokens.btc.env';
import {
	ETHEREUM_TOKEN,
	ETHEREUM_TOKEN_ID,
	SEPOLIA_TOKEN,
	SEPOLIA_TOKEN_ID
} from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import type { EthTransactionType } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { Token } from '$lib/types/token';
import type {
	AllTransactionUiWithCmp,
	AnyTransactionUi,
	Transaction
} from '$lib/types/transaction';
import {
	areTransactionsStoresLoading,
	isTransactionsStoreEmpty,
	isTransactionsStoreInitialized,
	isTransactionsStoreNotInitialized,
	mapAllTransactionsUi,
	sortTransactions
} from '$lib/utils/transactions.utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';

describe('transactions.utils', () => {
	describe('mapAllTransactionsUi', () => {
		const btcTokens = [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN];
		const ethTokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN];
		const icTokens = [ICP_TOKEN];
		const solTokens = [SOLANA_TOKEN];
		const tokens = [...btcTokens, ...ethTokens, ...icTokens, ...solTokens];

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

		const mockSolTransactionsUi: SolTransactionUi[] = createMockSolTransactionsUi(4);
		const mockSolTransactions: CertifiedStoreData<TransactionsData<SolTransactionUi>> = {
			[SOLANA_TOKEN_ID]: mockSolTransactionsUi.map((data) => ({ data, certified }))
		};

		const expectedBtcMainnetTransactions: AllTransactionUiWithCmp[] = [
			...mockBtcMainnetTransactions.map((transaction) => ({
				transaction,
				token: BTC_MAINNET_TOKEN,
				component: 'bitcoin' as const
			}))
		];

		const type = 'receive' as EthTransactionType;

		const expectedEthMainnetTransactions: AllTransactionUiWithCmp[] = [
			...mockEthMainnetTransactions.map((transaction) => ({
				transaction: {
					...transaction,
					id: transaction.hash ?? '',
					type
				},
				token: ETHEREUM_TOKEN,
				component: 'ethereum' as const
			}))
		];

		const expectedSepoliaTransactions: AllTransactionUiWithCmp[] = [
			...mockSepoliaTransactions.map((transaction) => ({
				transaction: {
					...transaction,
					id: transaction.hash ?? '',
					type
				},
				token: SEPOLIA_TOKEN,
				component: 'ethereum' as const
			}))
		];

		const expectedErc20Transactions: AllTransactionUiWithCmp[] = [
			...mockErc20Transactions.map((transaction) => ({
				transaction: {
					...transaction,
					id: transaction.hash ?? '',
					type
				},
				token: PEPE_TOKEN,
				component: 'ethereum' as const
			}))
		];

		const expectedEthTransactions: AllTransactionUiWithCmp[] = [
			...expectedEthMainnetTransactions,
			...expectedSepoliaTransactions,
			...expectedErc20Transactions
		];

		const expectedIcTransactions: AllTransactionUiWithCmp[] = [
			...mockIcTransactionsUi.map((transaction) => ({
				transaction,
				token: ICP_TOKEN,
				component: 'ic' as const
			}))
		];

		const expectedSolTransactions: AllTransactionUiWithCmp[] = [
			...mockSolTransactionsUi.map((transaction) => ({
				transaction,
				token: SOLANA_TOKEN,
				component: 'solana' as const
			}))
		];

		const expectedTransactions: AllTransactionUiWithCmp[] = [
			...expectedBtcMainnetTransactions,
			...expectedEthTransactions,
			...expectedIcTransactions,
			...expectedSolTransactions
		];

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(ethEnv, 'SUPPORTED_ETHEREUM_NETWORKS_IDS', 'get').mockImplementation(() => [
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
				$solTransactions: {},
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
				$solTransactions: {},
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
				$solTransactions: {},
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

		describe('SOL transactions', () => {
			const tokens = [...solTokens];

			const rest = {
				$btcTransactions: undefined,
				$ckEthMinterInfo: {},
				$ethTransactions: {},
				$ethAddress: undefined,
				$icTransactions: {},
				$btcStatuses: undefined
			};

			it('should map SOL transactions correctly', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$solTransactions: mockSolTransactions,
					...rest
				});

				expect(result).toHaveLength(mockSolTransactionsUi.length);
				expect(result).toEqual(expectedSolTransactions);
			});

			it('should return an empty array if the SOL transactions store is not initialized', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$solTransactions: {},
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
					$solTransactions: mockSolTransactions,
					$btcStatuses: undefined
				});

				expect(result).toHaveLength(
					mockBtcMainnetTransactions.length +
						mockEthMainnetTransactions.length +
						mockSepoliaTransactions.length +
						mockErc20Transactions.length +
						mockIcTransactionsUi.length +
						mockSolTransactionsUi.length
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

		it('should sort transactions with nullish timestamps last', () => {
			const result = [transaction1, transactionWithNullTimestamp, transaction2].sort((a, b) =>
				sortTransactions({ transactionA: a, transactionB: b })
			);

			expect(result).toEqual([transaction2, transaction1, transactionWithNullTimestamp]);
		});
	});

	describe('isTransactionsStoreInitialized', () => {
		const mockParams = {
			transactionsStoreData: {
				[BTC_MAINNET_TOKEN_ID]: createMockBtcTransactionsUi(5).map((data) => ({
					data,
					certified: true
				})),
				[BTC_TESTNET_TOKEN_ID]: createMockBtcTransactionsUi(7).map((data) => ({
					data,
					certified: true
				}))
			},
			tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]
		};

		it('should return false when transactions store is nullish', () => {
			expect(
				isTransactionsStoreInitialized({ ...mockParams, transactionsStoreData: undefined })
			).toBeFalsy();
		});

		it('should return false when transactions store index does not match enabled tokens', () => {
			expect(
				isTransactionsStoreInitialized({
					...mockParams,
					tokens: [...mockParams.tokens, BTC_REGTEST_TOKEN]
				})
			).toBeFalsy();
		});

		it('should return true when transactions store index matches enabled tokens', () => {
			expect(isTransactionsStoreInitialized(mockParams)).toBeTruthy();
		});
	});

	describe('isTransactionsStoreNotInitialized', () => {
		const mockParams = {
			transactionsStoreData: {
				[BTC_MAINNET_TOKEN_ID]: createMockBtcTransactionsUi(5).map((data) => ({
					data,
					certified: true
				})),
				[BTC_TESTNET_TOKEN_ID]: createMockBtcTransactionsUi(7).map((data) => ({
					data,
					certified: true
				}))
			},
			tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]
		};

		it('should return true when transactions store is nullish', () => {
			expect(
				isTransactionsStoreNotInitialized({ ...mockParams, transactionsStoreData: undefined })
			).toBeTruthy();
		});

		it('should return true when transactions store index does not match enabled tokens', () => {
			expect(
				isTransactionsStoreNotInitialized({
					...mockParams,
					tokens: [...mockParams.tokens, BTC_REGTEST_TOKEN]
				})
			).toBeTruthy();
		});

		it('should return false when transactions store index matches enabled tokens', () => {
			expect(isTransactionsStoreNotInitialized(mockParams)).toBeFalsy();
		});
	});

	describe('isTransactionsStoreEmpty', () => {
		it('should return true when transactions store have no data', () => {
			expect(
				isTransactionsStoreEmpty({
					transactionsStoreData: {},
					tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]
				})
			).toBeTruthy();
		});

		it('should return true when transactions store have no transactions for all the tokens', () => {
			expect(
				isTransactionsStoreEmpty({
					transactionsStoreData: {
						[BTC_MAINNET_TOKEN_ID]: [],
						[BTC_TESTNET_TOKEN_ID]: []
					},
					tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]
				})
			).toBeTruthy();
		});

		it('should return true when transactions store is a mix of missing data and empty transactions', () => {
			expect(
				isTransactionsStoreEmpty({
					transactionsStoreData: {
						[BTC_MAINNET_TOKEN_ID]: [],
						[BTC_TESTNET_TOKEN_ID]: []
					},
					tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN, BTC_REGTEST_TOKEN]
				})
			).toBeTruthy();
		});

		it('should return false when there is at least one token with transactions', () => {
			expect(
				isTransactionsStoreEmpty({
					transactionsStoreData: {
						[BTC_MAINNET_TOKEN_ID]: createMockBtcTransactionsUi(5).map((data) => ({
							data,
							certified: true
						})),
						[BTC_TESTNET_TOKEN_ID]: []
					},
					tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]
				})
			).toBeFalsy();
		});

		it('should return false when all tokens have transactions', () => {
			expect(
				isTransactionsStoreEmpty({
					transactionsStoreData: {
						[BTC_MAINNET_TOKEN_ID]: createMockBtcTransactionsUi(5).map((data) => ({
							data,
							certified: true
						})),
						[BTC_TESTNET_TOKEN_ID]: createMockBtcTransactionsUi(7).map((data) => ({
							data,
							certified: true
						}))
					},
					tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]
				})
			).toBeFalsy();
		});
	});

	describe('areTransactionsStoresLoading', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		const mockBtcTransactionStoreData: {
			transactionsStoreData: CertifiedStoreData<TransactionsData<BtcTransactionUi>>;
			tokens: Token[];
		} = {
			transactionsStoreData: {
				[BTC_MAINNET_TOKEN_ID]: createMockBtcTransactionsUi(5).map((data) => ({
					data,
					certified: true
				})),
				[BTC_TESTNET_TOKEN_ID]: createMockBtcTransactionsUi(7).map((data) => ({
					data,
					certified: true
				}))
			},
			tokens: [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]
		};
		const mockEthTransactionStoreData: {
			transactionsStoreData: EthTransactionsData;
			tokens: Token[];
		} = {
			transactionsStoreData: {
				[ETHEREUM_TOKEN_ID]: createMockEthTransactions(9),
				[SEPOLIA_TOKEN_ID]: createMockEthTransactions(7),
				[PEPE_TOKEN_ID]: createMockEthTransactions(4)
			},
			tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
		};
		const mockIcTransactionStoreData: {
			transactionsStoreData: CertifiedStoreData<TransactionsData<IcTransactionUi>>;
			tokens: Token[];
		} = {
			transactionsStoreData: {
				[ICP_TOKEN_ID]: createMockIcTransactionsUi(7).map((data) => ({
					data,
					certified: true
				}))
			},
			tokens: [ICP_TOKEN]
		};
		const mockSolTransactionStoreData: {
			transactionsStoreData: CertifiedStoreData<TransactionsData<SolTransactionUi>>;
			tokens: Token[];
		} = {
			transactionsStoreData: {
				[SOLANA_TOKEN_ID]: createMockSolTransactionsUi(4).map((data) => ({
					data,
					certified: true
				})),
				[BONK_TOKEN_ID]: createMockSolTransactionsUi(2).map((data) => ({
					data,
					certified: true
				}))
			},
			tokens: [SOLANA_TOKEN, BONK_TOKEN]
		};

		it('should return true if all transactionsStoreData is nullish', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: undefined,
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: undefined,
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: undefined, tokens: [] }
			]);

			expect(result).toBeTruthy();
		});

		it('should return true if some transactionsStoreData is nullish and the rest is empty', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: [],
						[SEPOLIA_TOKEN_ID]: []
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: { [SOLANA_TOKEN_ID]: [], [BONK_TOKEN_ID]: [] },
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: undefined, tokens: [ICP_TOKEN] }
			]);

			expect(result).toBeTruthy();
		});

		it('should return true if all transactions stores are not initialized', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: {},
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: {}, tokens: [ICP_TOKEN] }
			]);

			expect(result).toBeTruthy();
		});

		it('should return true if some transactions stores are not initialized and the rest is empty', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: [],
						[SEPOLIA_TOKEN_ID]: [],
						[PEPE_TOKEN_ID]: []
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: {},
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: {}, tokens: [ICP_TOKEN] }
			]);

			expect(result).toBeTruthy();
		});

		it('should return true if some transactions stores are nullish and the rest is empty', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: [],
						[SEPOLIA_TOKEN_ID]: []
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: undefined,
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: undefined, tokens: [ICP_TOKEN] }
			]);

			expect(result).toBeTruthy();
		});

		it('should return true if some transactions stores are not initialized and the rest is empty or nullish', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: [],
						[SEPOLIA_TOKEN_ID]: []
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: {},
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: undefined, tokens: [ICP_TOKEN] }
			]);

			expect(result).toBeTruthy();
		});

		it('should return false if some transactions stores are partially initialized', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: createMockEthTransactions(9),
						[SEPOLIA_TOKEN_ID]: createMockEthTransactions(7)
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: {
						[SOLANA_TOKEN_ID]: null
					},
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: {}, tokens: [ICP_TOKEN] }
			]);

			expect(result).toBeFalsy();
		});

		it('should return true if some transactions stores are partially initialized but all of them are empty', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: [],
						[SEPOLIA_TOKEN_ID]: []
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: {
						[SOLANA_TOKEN_ID]: [],
						[BONK_TOKEN_ID]: []
					},
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{
					transactionsStoreData: {
						[ICP_TOKEN_ID]: []
					},
					tokens: [ICP_TOKEN]
				}
			]);

			expect(result).toBeTruthy();
		});

		it('should return false if all transactions stores are empty but initialized and non-nullish', () => {
			const result = areTransactionsStoresLoading([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: [],
						[SEPOLIA_TOKEN_ID]: []
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN]
				},
				{
					transactionsStoreData: {
						[ICP_TOKEN_ID]: []
					},
					tokens: [ICP_TOKEN]
				},
				{
					transactionsStoreData: {
						[SOLANA_TOKEN_ID]: [],
						[BONK_TOKEN_ID]: []
					},
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				}
			]);

			expect(result).toBeFalsy();
		});

		it('should return false if at least one transactions store is initialized and non-empty', () => {
			const result = areTransactionsStoresLoading([
				mockBtcTransactionStoreData,
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: [],
						[SEPOLIA_TOKEN_ID]: []
					},
					tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
				},
				{
					transactionsStoreData: {},
					tokens: [SOLANA_TOKEN, BONK_TOKEN]
				},
				{ transactionsStoreData: undefined, tokens: [ICP_TOKEN] }
			]);

			expect(result).toBeFalsy();
		});

		it('should return false if all transactions stores are initialized and non-empty', () => {
			expect(
				areTransactionsStoresLoading([
					mockBtcTransactionStoreData,
					mockEthTransactionStoreData,
					mockIcTransactionStoreData,
					mockSolTransactionStoreData
				])
			).toBeFalsy();
		});

		it('should return false if there is at least one transactions store that is nullish', () => {
			expect(
				areTransactionsStoresLoading([
					mockBtcTransactionStoreData,
					mockEthTransactionStoreData,
					mockIcTransactionStoreData,
					mockSolTransactionStoreData,
					{
						transactionsStoreData: undefined,
						tokens: []
					}
				])
			).toBeFalsy();
		});

		it('should return false if there is at least one transactions store that is not initialized', () => {
			expect(
				areTransactionsStoresLoading([
					mockBtcTransactionStoreData,
					mockEthTransactionStoreData,
					mockIcTransactionStoreData,
					mockSolTransactionStoreData,
					{
						transactionsStoreData: {},
						tokens: []
					}
				])
			).toBeFalsy();
		});

		it('should return false if one of the tokens list is empty', () => {
			expect(
				areTransactionsStoresLoading([
					{
						transactionsStoreData: {
							[ETHEREUM_TOKEN_ID]: [],
							[SEPOLIA_TOKEN_ID]: []
						},
						tokens: []
					},
					{
						transactionsStoreData: {
							[ICP_TOKEN_ID]: []
						},
						tokens: [ICP_TOKEN]
					},
					{
						transactionsStoreData: {
							[SOLANA_TOKEN_ID]: [],
							[BONK_TOKEN_ID]: []
						},
						tokens: [SOLANA_TOKEN, BONK_TOKEN]
					}
				])
			).toBeFalsy();
		});

		it('should return false for an empty input array', () => {
			expect(areTransactionsStoresLoading([])).toBeFalsy();
		});
	});
});
