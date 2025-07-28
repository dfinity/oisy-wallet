import type { BtcCertifiedTransactionsData } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcTransactionType } from '$btc/types/btc-transaction';
import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN, PEPE_TOKEN_ID } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import {
	BASE_ETH_TOKEN,
	BASE_ETH_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN,
	BNB_MAINNET_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
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
import type {
	EthCertifiedTransaction,
	EthCertifiedTransactionsData
} from '$eth/stores/eth-transactions.store';
import type { EthTransactionType } from '$eth/types/eth-transaction';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { IcTransactionType, IcTransactionUi } from '$icp/types/ic-transaction';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import type { AllTransactionUiWithCmp, AnyTransactionUi } from '$lib/types/transaction';
import {
	areTransactionsStoresLoaded,
	areTransactionsStoresLoading,
	filterReceivedMicroTransactions,
	findOldestTransaction,
	getKnownDestinations,
	getReceivedMicroTransactions,
	isTransactionsStoreEmpty,
	isTransactionsStoreInitialized,
	isTransactionsStoreNotInitialized,
	mapAllTransactionsUi,
	sortTransactions
} from '$lib/utils/transactions.utils';
import type { SolCertifiedTransactionsData } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthCertifiedTransactions } from '$tests/mocks/eth-transactions.mock';
import { getMockExchanges, mockExchanges } from '$tests/mocks/exchanges.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';

describe('transactions.utils', () => {
	describe('mapAllTransactionsUi', () => {
		const btcTokens = [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN];
		const ethTokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN];
		const evmTokens = [BASE_ETH_TOKEN, BNB_MAINNET_TOKEN];
		const icTokens = [ICP_TOKEN];
		const solTokens = [SOLANA_TOKEN];
		const tokens = [...btcTokens, ...ethTokens, ...evmTokens, ...icTokens, ...solTokens];

		const certified = false;

		const mockBtcMainnetTransactions: BtcTransactionUi[] = createMockBtcTransactionsUi(5);

		const mockBtcTestnetTransactions: BtcTransactionUi[] = createMockBtcTransactionsUi(3);

		const mockBtcTransactions: BtcCertifiedTransactionsData = {
			[BTC_MAINNET_TOKEN_ID]: mockBtcMainnetTransactions.map((data) => ({ data, certified })),
			[BTC_TESTNET_TOKEN_ID]: mockBtcTestnetTransactions.map((data) => ({ data, certified }))
		};

		const mockEthMainnetTransactions: EthCertifiedTransaction[] =
			createMockEthCertifiedTransactions(9);

		const mockSepoliaTransactions: EthCertifiedTransaction[] =
			createMockEthCertifiedTransactions(7);

		const mockErc20Transactions: EthCertifiedTransaction[] = createMockEthCertifiedTransactions(4);

		const mockBaseMainnetTransactions: EthCertifiedTransaction[] =
			createMockEthCertifiedTransactions(3);

		const mockBnbMainnetTransactions: EthCertifiedTransaction[] =
			createMockEthCertifiedTransactions(2);

		const mockEthTransactions: EthCertifiedTransactionsData = {
			[ETHEREUM_TOKEN_ID]: mockEthMainnetTransactions,
			[SEPOLIA_TOKEN_ID]: mockSepoliaTransactions,
			[PEPE_TOKEN_ID]: mockErc20Transactions,
			[BASE_ETH_TOKEN_ID]: mockBaseMainnetTransactions,
			[BNB_MAINNET_TOKEN_ID]: mockBnbMainnetTransactions
		};

		const mockIcTransactionsUi: IcTransactionUi[] = createMockIcTransactionsUi(7);
		const mockIcTransactions: IcCertifiedTransactionsData = {
			[ICP_TOKEN_ID]: mockIcTransactionsUi.map((data) => ({ data, certified }))
		};

		const mockSolTransactionsUi: SolTransactionUi[] = createMockSolTransactionsUi(4);
		const mockSolTransactions: SolCertifiedTransactionsData = {
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
			...mockEthMainnetTransactions.map(({ data: transaction }) => ({
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
			...mockSepoliaTransactions.map(({ data: transaction }) => ({
				transaction: {
					...transaction,
					id: transaction.hash ?? '',
					type
				},
				token: SEPOLIA_TOKEN,
				component: 'ethereum' as const
			}))
		];

		const expectedBaseMainnetTransactions: AllTransactionUiWithCmp[] = [
			...mockBaseMainnetTransactions.map(({ data: transaction }) => ({
				transaction: {
					...transaction,
					id: transaction.hash ?? '',
					type
				},
				token: BASE_ETH_TOKEN,
				component: 'ethereum' as const
			}))
		];

		const expectedBnbMainnetTransactions: AllTransactionUiWithCmp[] = [
			...mockBnbMainnetTransactions.map(({ data: transaction }) => ({
				transaction: {
					...transaction,
					id: transaction.hash ?? '',
					type
				},
				token: BNB_MAINNET_TOKEN,
				component: 'ethereum' as const
			}))
		];

		const expectedErc20Transactions: AllTransactionUiWithCmp[] = [
			...mockErc20Transactions.map(({ data: transaction }) => ({
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
			...expectedErc20Transactions,
			...expectedBaseMainnetTransactions,
			...expectedBnbMainnetTransactions
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

			vi.spyOn(ethEnv, 'SUPPORTED_ETHEREUM_NETWORK_IDS', 'get').mockImplementation(() => [
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
				$btcStatuses: undefined,
				$ckBtcPendingUtxosStore: undefined,
				$icPendingTransactionsStore: undefined,
				$ckBtcMinterInfoStore: undefined,
				$icTransactionsStore: undefined
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
				const mockBtcTransactions: BtcCertifiedTransactionsData = {
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
			const tokens = [...ethTokens, ...evmTokens];

			const rest = {
				$btcTransactions: undefined,
				$ckEthMinterInfo: {},
				$ethAddress: undefined,
				$icTransactions: {},
				$solTransactions: {},
				$btcStatuses: undefined,
				$ckBtcPendingUtxosStore: undefined,
				$icPendingTransactionsStore: undefined,
				$ckBtcMinterInfoStore: undefined,
				$icTransactionsStore: undefined
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
						mockErc20Transactions.length +
						mockBaseMainnetTransactions.length +
						mockBnbMainnetTransactions.length
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

				const mockEthTransactions: EthCertifiedTransactionsData = {
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
				const mockEthTransactions: EthCertifiedTransactionsData = {
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
				$btcStatuses: undefined,
				$ckBtcPendingUtxosStore: undefined,
				$icPendingTransactionsStore: undefined,
				$ckBtcMinterInfoStore: undefined
			};

			it('should map IC transactions correctly', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$icTransactionsStore: mockIcTransactions,
					...rest
				});

				expect(result).toHaveLength(mockIcTransactionsUi.length);
				expect(result).toEqual(expectedIcTransactions);
			});

			it('should return an empty array if the IC transactions store is not initialized', () => {
				const result = mapAllTransactionsUi({
					tokens,
					$icTransactionsStore: undefined,
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
				$btcStatuses: undefined,
				$ckBtcPendingUtxosStore: undefined,
				$icPendingTransactionsStore: undefined,
				$ckBtcMinterInfoStore: undefined,
				$icTransactionsStore: undefined
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
					$solTransactions: mockSolTransactions,
					$btcStatuses: undefined,
					$ckBtcPendingUtxosStore: undefined,
					$icPendingTransactionsStore: undefined,
					$ckBtcMinterInfoStore: undefined,
					$icTransactionsStore: mockIcTransactions
				});

				expect(result).toHaveLength(
					mockBtcMainnetTransactions.length +
						mockEthMainnetTransactions.length +
						mockSepoliaTransactions.length +
						mockErc20Transactions.length +
						mockIcTransactionsUi.length +
						mockSolTransactionsUi.length +
						mockBnbMainnetTransactions.length +
						mockBaseMainnetTransactions.length
				);

				expect(result).toEqual(expectedTransactions);
			});
		});
	});

	describe('MicroTransactions', () => {
		const btcTokens = [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN];
		const ethTokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN];
		const icTokens = [ICP_TOKEN];
		const solTokens = [SOLANA_TOKEN];
		const tokens = [...btcTokens, ...ethTokens, ...icTokens, ...solTokens];

		const mockBtcMainnetTransactions: BtcTransactionUi[] = createMockBtcTransactionsUi(3);
		const mockBtcTransactions: BtcCertifiedTransactionsData = {
			[BTC_MAINNET_TOKEN_ID]: mockBtcMainnetTransactions.map((data) => ({ data, certified: false }))
		};

		const mockEthMainnetTransactions: EthCertifiedTransaction[] =
			createMockEthCertifiedTransactions(5);
		const mockEthTransactions: EthCertifiedTransactionsData = {
			[ETHEREUM_TOKEN_ID]: mockEthMainnetTransactions
		};

		const mockIcTransactionsUi: IcTransactionUi[] = createMockIcTransactionsUi(7);
		const mockIcTransactions: IcCertifiedTransactionsData = {
			[ICP_TOKEN_ID]: mockIcTransactionsUi.map((data) => ({
				data: { ...data, type: 'receive' },
				certified: false
			}))
		};

		const rest = {
			$ckEthMinterInfo: {},
			$ethAddress: undefined,
			$solTransactions: {},
			$btcStatuses: undefined,
			$ckBtcPendingUtxosStore: undefined,
			$icPendingTransactionsStore: undefined,
			$ckBtcMinterInfoStore: undefined
		};

		afterEach(() => {
			getMockExchanges({ token: ICP_TOKEN, usd: 1 });
			getMockExchanges({ token: BTC_MAINNET_TOKEN, usd: 1 });
			getMockExchanges({ token: ETHEREUM_TOKEN, usd: 1 });
		});

		describe('filterReceivedMicroTransactions', () => {
			it('should filter all received micro transactions', () => {
				const transactions = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					$ethTransactions: mockEthTransactions,
					$icTransactionsStore: mockIcTransactions,
					...rest
				});

				let filteredTransactions = filterReceivedMicroTransactions({
					transactions,
					exchanges:
						getMockExchanges({ token: ICP_TOKEN, usd: 20000000000000000000000 }) ?? mockExchanges
				});

				expect(filteredTransactions).toHaveLength(7);

				filteredTransactions = filterReceivedMicroTransactions({
					transactions,
					exchanges:
						getMockExchanges({ token: BTC_MAINNET_TOKEN, usd: 20000000000000000000000 }) ??
						mockExchanges
				});

				expect(filteredTransactions).toHaveLength(10);
			});

			it('should filter only received micro transactions', () => {
				const mockIcSendTransactions: IcCertifiedTransactionsData = {
					[ICP_TOKEN_ID]: mockIcTransactionsUi.map((data) => ({ data, certified: false }))
				};

				const transactions = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					$ethTransactions: mockEthTransactions,
					$icTransactionsStore: mockIcSendTransactions,
					...rest
				});

				const filteredTransactions = filterReceivedMicroTransactions({
					transactions,
					exchanges:
						getMockExchanges({ token: BTC_MAINNET_TOKEN, usd: 20000000000000000000000 }) ??
						mockExchanges
				});

				expect(filteredTransactions).toHaveLength(10);
			});
		});

		describe('getReceivedMicroTransactions', () => {
			it('should get all received micro transactions', () => {
				const transactions = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					$ethTransactions: mockEthTransactions,
					$icTransactionsStore: undefined,
					...rest
				});

				let microTransactions = getReceivedMicroTransactions({
					transactions,
					exchanges:
						getMockExchanges({ token: ICP_TOKEN, usd: 20000000000000000000000 }) ?? mockExchanges
				});

				expect(microTransactions).toHaveLength(8);

				microTransactions = getReceivedMicroTransactions({
					transactions,
					exchanges:
						getMockExchanges({ token: BTC_MAINNET_TOKEN, usd: 20000000000000000000000 }) ??
						mockExchanges
				});

				expect(microTransactions).toHaveLength(5);
			});

			it('should get only received micro transactions', () => {
				const transactions = mapAllTransactionsUi({
					tokens,
					$btcTransactions: mockBtcTransactions,
					$ethTransactions: mockEthTransactions,
					$icTransactionsStore: undefined,
					...rest
				});

				const microTransactions = getReceivedMicroTransactions({
					transactions,
					exchanges:
						getMockExchanges({ token: BTC_MAINNET_TOKEN, usd: 20000000000000000000000 }) ??
						mockExchanges
				});

				expect(microTransactions).toHaveLength(5);
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
			transactionsStoreData: BtcCertifiedTransactionsData;
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
			transactionsStoreData: EthCertifiedTransactionsData;
			tokens: Token[];
		} = {
			transactionsStoreData: {
				[ETHEREUM_TOKEN_ID]: createMockEthCertifiedTransactions(9),
				[SEPOLIA_TOKEN_ID]: createMockEthCertifiedTransactions(7),
				[PEPE_TOKEN_ID]: createMockEthCertifiedTransactions(4)
			},
			tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
		};
		const mockIcTransactionStoreData: {
			transactionsStoreData: IcCertifiedTransactionsData;
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
			transactionsStoreData: SolCertifiedTransactionsData;
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
						[ETHEREUM_TOKEN_ID]: createMockEthCertifiedTransactions(9),
						[SEPOLIA_TOKEN_ID]: createMockEthCertifiedTransactions(7)
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

	describe('areTransactionsStoresLoaded', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		const mockBtcTransactionStoreData: {
			transactionsStoreData: BtcCertifiedTransactionsData;
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
			transactionsStoreData: EthCertifiedTransactionsData;
			tokens: Token[];
		} = {
			transactionsStoreData: {
				[ETHEREUM_TOKEN_ID]: createMockEthCertifiedTransactions(9),
				[SEPOLIA_TOKEN_ID]: createMockEthCertifiedTransactions(7),
				[PEPE_TOKEN_ID]: createMockEthCertifiedTransactions(4)
			},
			tokens: [ETHEREUM_TOKEN, SEPOLIA_TOKEN, PEPE_TOKEN]
		};
		const mockIcTransactionStoreData: {
			transactionsStoreData: IcCertifiedTransactionsData;
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
			transactionsStoreData: SolCertifiedTransactionsData;
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

		it('should return false if all transactionsStoreData is nullish', () => {
			const result = areTransactionsStoresLoaded([
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

			expect(result).toBeFalsy();
		});

		it('should return false if some transactionsStoreData is nullish and the rest is empty', () => {
			const result = areTransactionsStoresLoaded([
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

			expect(result).toBeFalsy();
		});

		it('should return false if all transactions stores are not initialized', () => {
			const result = areTransactionsStoresLoaded([
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

			expect(result).toBeFalsy();
		});

		it('should return false if some transactions stores are not initialized and the rest is empty', () => {
			const result = areTransactionsStoresLoaded([
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

			expect(result).toBeFalsy();
		});

		it('should return false if some transactions stores are nullish and the rest is empty', () => {
			const result = areTransactionsStoresLoaded([
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

			expect(result).toBeFalsy();
		});

		it('should return false if some transactions stores are not initialized and the rest is empty or nullish', () => {
			const result = areTransactionsStoresLoaded([
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

		it('should return false if some transactions stores are partially initialized', () => {
			const result = areTransactionsStoresLoaded([
				{
					transactionsStoreData: {
						[ETHEREUM_TOKEN_ID]: createMockEthCertifiedTransactions(9),
						[SEPOLIA_TOKEN_ID]: createMockEthCertifiedTransactions(7)
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

		it('should return false if some transactions stores are partially initialized but all of them are empty', () => {
			const result = areTransactionsStoresLoaded([
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

			expect(result).toBeFalsy();
		});

		it('should return true if all transactions stores are empty but initialized and non-nullish', () => {
			const result = areTransactionsStoresLoaded([
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

			expect(result).toBeTruthy();
		});

		it('should return false if at least one transactions store is initialized and non-empty', () => {
			const result = areTransactionsStoresLoaded([
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

		it('should return true if all transactions stores are initialized and non-empty', () => {
			expect(
				areTransactionsStoresLoaded([
					mockBtcTransactionStoreData,
					mockEthTransactionStoreData,
					mockIcTransactionStoreData,
					mockSolTransactionStoreData
				])
			).toBeTruthy();
		});

		it('should return true if there is at least one transactions store that is nullish', () => {
			expect(
				areTransactionsStoresLoaded([
					mockBtcTransactionStoreData,
					mockEthTransactionStoreData,
					mockIcTransactionStoreData,
					mockSolTransactionStoreData,
					{
						transactionsStoreData: undefined,
						tokens: []
					}
				])
			).toBeTruthy();
		});

		it('should return true if there is at least one transactions store that is not initialized', () => {
			expect(
				areTransactionsStoresLoaded([
					mockBtcTransactionStoreData,
					mockEthTransactionStoreData,
					mockIcTransactionStoreData,
					mockSolTransactionStoreData,
					{
						transactionsStoreData: {},
						tokens: []
					}
				])
			).toBeTruthy();
		});

		it('should return true if one of the tokens list is empty', () => {
			expect(
				areTransactionsStoresLoaded([
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
			).toBeTruthy();
		});

		it('should return false for an empty input array', () => {
			expect(areTransactionsStoresLoaded([])).toBeFalsy();
		});
	});

	describe('getKnownDestinations', () => {
		it('should correctly return a single known destinations', () => {
			const icTransactionsUi = createMockIcTransactionsUi(7).map((transaction) => ({
				...transaction,
				token: ICP_TOKEN
			}));
			const expectedIcKnownDestinations = {
				[icTransactionsUi[0].to as string]: {
					amounts: icTransactionsUi.map(({ value, token }) => ({ value, token })),
					timestamp: Number(icTransactionsUi[0].timestamp),
					address: icTransactionsUi[0].to
				}
			};

			expect(getKnownDestinations(icTransactionsUi)).toEqual(expectedIcKnownDestinations);
		});

		it('should correctly return multiple known destinations', () => {
			const icTransactionsUi1 = {
				...createMockIcTransactionsUi(1)[0],
				token: ICP_TOKEN
			};
			const icTransactionsUi2 = {
				...createMockIcTransactionsUi(1)[0],
				token: ICP_TOKEN,
				to: icTransactionsUi1.from
			};

			expect(getKnownDestinations([icTransactionsUi1, icTransactionsUi2])).toEqual({
				[icTransactionsUi1.to as string]: {
					amounts: [{ value: icTransactionsUi1.value, token: icTransactionsUi1.token }],
					timestamp: Number(icTransactionsUi1.timestamp),
					address: icTransactionsUi1.to
				},
				[icTransactionsUi2.to as string]: {
					amounts: [{ value: icTransactionsUi2.value, token: icTransactionsUi2.token }],
					timestamp: Number(icTransactionsUi2.timestamp),
					address: icTransactionsUi2.to
				}
			});
		});

		it('should correctly return multiple known destinations if a tx has "to" as an array', () => {
			const [mockTransaction] = createMockBtcTransactionsUi(1);
			const btcTransactionsUi = {
				...mockTransaction,
				type: 'send' as BtcTransactionType,
				to: [...(mockTransaction.to as string[]), mockTransaction.from] as string[],
				token: BTC_MAINNET_TOKEN
			};

			expect(getKnownDestinations([btcTransactionsUi])).toEqual({
				[btcTransactionsUi.to[0] as string]: {
					amounts: [{ value: btcTransactionsUi.value, token: btcTransactionsUi.token }],
					timestamp: Number(btcTransactionsUi.timestamp),
					address: btcTransactionsUi.to[0]
				},
				[btcTransactionsUi.to[1] as string]: {
					amounts: [{ value: btcTransactionsUi.value, token: btcTransactionsUi.token }],
					timestamp: Number(btcTransactionsUi.timestamp),
					address: btcTransactionsUi.to[1]
				}
			});
		});

		it('should correctly take the latest timestamp', () => {
			const icTransactionsUi = createMockIcTransactionsUi(7).map(
				({ timestamp, ...rest }, index) => ({
					...rest,
					timestamp: (timestamp ?? ZERO) + BigInt(index),
					token: ICP_TOKEN
				})
			);
			const expectedIcKnownDestinations = {
				[icTransactionsUi[0].to as string]: {
					amounts: icTransactionsUi.map(({ value, token }) => ({ value, token })),
					timestamp: Number(icTransactionsUi[icTransactionsUi.length - 1].timestamp),
					address: icTransactionsUi[0].to
				}
			};

			expect(getKnownDestinations(icTransactionsUi)).toEqual(expectedIcKnownDestinations);
		});

		it('should correctly return an empty array if all txs do not have values', () => {
			const icTransactionsUi = createMockIcTransactionsUi(7).map(({ value: _, ...rest }) => ({
				...rest,
				token: ICP_TOKEN,
				value: undefined
			}));

			expect(getKnownDestinations(icTransactionsUi)).toEqual({});
		});

		it('should correctly return an empty array if all txs have zero values', () => {
			const icTransactionsUi = createMockIcTransactionsUi(7).map(({ value: _, ...rest }) => ({
				...rest,
				token: ICP_TOKEN,
				value: ZERO
			}));

			expect(getKnownDestinations(icTransactionsUi)).toEqual({});
		});

		it('should correctly return an empty array if all txs are receive', () => {
			const icTransactionsUi = createMockIcTransactionsUi(7).map(({ type: _, ...rest }) => ({
				...rest,
				token: ICP_TOKEN,
				type: 'receive' as IcTransactionType
			}));

			expect(getKnownDestinations(icTransactionsUi)).toEqual({});
		});
	});

	describe('findOldestTransaction', () => {
		const icTransactions: IcTransactionUi[] = createMockIcTransactionsUi(17).map(
			(transaction, index) => ({
				...transaction,
				timestamp: 100n + BigInt(index)
			})
		);
		const solTransactions: SolTransactionUi[] = createMockSolTransactionsUi(19).map(
			(transaction, index) => ({
				...transaction,
				timestamp: 200n + BigInt(index)
			})
		);

		const mockTransactions: (IcTransactionUi | SolTransactionUi)[] = [
			...icTransactions,
			...solTransactions
		].sort(() => Math.random() - 0.5);

		const [expectedOldestTransaction] = icTransactions;

		it('should return undefined if no transactions are provided', () => {
			expect(findOldestTransaction([])).toBeUndefined();
		});

		it('should return the oldest transaction', () => {
			expect(findOldestTransaction(mockTransactions)).toStrictEqual(expectedOldestTransaction);
		});

		it('should return the first transaction in the list if they have the same timestamp', () => {
			const newTransactions: IcTransactionUi[] = icTransactions.map((transaction) => ({
				...transaction,
				id: `${transaction.id}-new`
			}));

			expect(findOldestTransaction([...mockTransactions, ...newTransactions])).toStrictEqual(
				expectedOldestTransaction
			);
		});

		it('should handle mixed timestamp between number, bigint and undefined', () => {
			const transactionsWithNumber: IcTransactionUi[] = createMockIcTransactionsUi(17).map(
				(transaction, index) => ({
					...transaction,
					timestamp: 1n + BigInt(index)
				})
			);
			const transactionsWitUndefined: SolTransactionUi[] = createMockSolTransactionsUi(17).map(
				(transaction) => ({
					...transaction,
					timestamp: undefined
				})
			);

			const [expectedTransaction] = transactionsWithNumber;

			expect(
				findOldestTransaction([
					...mockTransactions,
					...transactionsWithNumber,
					...transactionsWitUndefined
				])
			).toStrictEqual(expectedTransaction);
		});
	});
});
