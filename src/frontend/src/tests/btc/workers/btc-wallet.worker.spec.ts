import { BtcWalletScheduler } from '$btc/schedulers/btc-wallet.scheduler';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import * as backendApi from '$lib/api/backend.api';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { WALLET_TIMER_INTERVAL_MILLIS, ZERO } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import * as blockchainRest from '$lib/rest/blockchain.rest';
import * as blockstreamRest from '$lib/rest/blockstream.rest';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import type { PostMessageDataRequestBtc } from '$lib/types/post-message';
import { mockBtcTransaction } from '$tests/mocks/blockchain-transactions.mock';
import { mockBlockchainResponse } from '$tests/mocks/blockchain.mock';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TestUtil } from '$tests/types/utils';
import { jsonReplacer, queryAndUpdate, type QueryAndUpdateParams } from '@dfinity/utils';
import { BitcoinCanister, type BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import { waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('$lib/providers/auth-client.providers', async (importActual) => {
	const authClientProvider = vi.fn().mockReturnValue({
		loadIdentity: vi.fn()
	});

	return {
		...(await importActual()),
		AuthClientProvider: Object.assign(authClientProvider, {
			getInstance: authClientProvider
		})
	};
});

vi.mock(import('$lib/services/query.services'), async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...actual,
		createQueryAndUpdateWithWarmup: () =>
			actual.createQueryAndUpdateWithWarmup({ warmupMs: 0, defaultStrategy: 'query_and_update' })
	};
});

describe('btc-wallet.worker', () => {
	let spyGetCertifiedBalance: MockInstance;
	let spyGetUncertifiedBalance: MockInstance;

	const signerCanisterMock = mock<SignerCanister>();
	const bitcoinCanisterMock = mock<BitcoinCanister>();

	let originalPostmessage: unknown;

	const mockBalance = 100n;

	const latestBitcoinBlockHeight = 100;

	const mockPostMessageStatusInProgress = {
		msg: 'syncBtcWalletStatus',
		data: {
			state: 'in_progress'
		}
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncBtcWalletStatus',
		data: {
			state: 'idle'
		}
	};

	const mockProviderTransaction = mapBtcTransaction({
		transaction: mockBtcTransaction,
		latestBitcoinBlockHeight,
		btcAddress: mockBtcAddress
	});

	// The shared provider fixture is an incoming transaction still in the mempool, which the Bitcoin
	// canister cannot see — so the balance counts it as unconfirmed on every sync, whether or not
	// that sync re-emits it as a new transaction.
	const mockUnconfirmed = mockProviderTransaction.value ?? ZERO;

	const mockPostMessage = ({
		certified,
		withTransactions,
		ref,
		locked = ZERO
	}: {
		certified: boolean;
		withTransactions: boolean;
		ref: string;
		locked?: bigint;
	}) => ({
		ref,
		msg: 'syncBtcWallet',
		data: {
			wallet: {
				balance: {
					certified,
					data: {
						confirmed: mockBalance - locked,
						unconfirmed: mockUnconfirmed,
						locked,
						total: mockBalance - locked + mockUnconfirmed
					}
				},
				newTransactions: JSON.stringify(
					withTransactions
						? [
								{
									data: mockProviderTransaction,
									// TODO: use "certified" instead of hardcoded value when we have a way of certifying BTC txs
									certified: false
								}
							]
						: [],
					jsonReplacer
				)
			}
		}
	});

	const postMessageMock = vi.fn();

	// We don't await the job execution promise in the scheduler's function, so we need to advance the timers to verify the correct execution of the job
	const awaitJobExecution = () => vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS - 100);

	// Production steady state: the warm-up has elapsed, so the wrapper only fires certified calls.
	const forceUpdateOnlyStrategy = (scheduler: BtcWalletScheduler) => {
		scheduler['_queryAndUpdateWithWarmup'] = async <R, E = unknown>(
			params: QueryAndUpdateParams<R, E>
		) => await queryAndUpdate<R, E>({ ...params, strategy: 'update' });
	};

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		const provider = AuthClientProvider.getInstance();
		vi.mocked(provider.loadIdentity).mockResolvedValue(mockIdentity);

		const mockBlockHeight = 1000;
		vi.spyOn(blockstreamRest, 'btcLatestBlockHeight').mockResolvedValue(mockBlockHeight);

		vi.spyOn(blockchainRest, 'btcAddressData').mockResolvedValue(mockBlockchainResponse);

		vi.spyOn(SignerCanister, 'create').mockResolvedValue(signerCanisterMock);
		vi.spyOn(BitcoinCanister, 'create').mockReturnValue(bitcoinCanisterMock);

		spyGetUncertifiedBalance = bitcoinCanisterMock.getBalanceQuery.mockResolvedValue(mockBalance);
		spyGetCertifiedBalance = signerCanisterMock.getBtcBalance.mockImplementation(async () => {
			await waitFor(() => Promise.resolve(), { timeout: 1000 });
			return mockBalance;
		});

		vi.spyOn(backendApi, 'getPendingBtcTransactions').mockResolvedValue({ response: [] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostmessage;
	});

	const testWorker = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequestBtc | undefined;
	}): TestUtil => {
		const scheduler: BtcWalletScheduler = new BtcWalletScheduler();

		const ref = startData?.btcAddress.data ?? '';

		const mockPostMessageUncertified = mockPostMessage({
			certified: false,
			withTransactions: true,
			ref
		});
		// Both passes of the mocked `query_and_update` strategy fetch the provider transactions
		// concurrently, so the certified pass carries them too.
		const mockPostMessageCertified = mockPostMessage({
			certified: true,
			withTransactions: true,
			ref
		});

		return {
			setup: () => {},

			teardown: () => {
				// Reset the internal store with transactions
				scheduler['store'] = {
					transactions: {},
					balance: undefined,
					latestBitcoinBlockHeight: undefined,
					pendingTransactions: undefined
				};

				scheduler.stop();
			},

			tests: () => {
				it('should trigger postMessage with correct data', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledTimes(4);
					// The uncertified/certified payloads may interleave between
					// the in_progress and idle brackets depending on microtask
					// timing, so assert membership and bracketing rather than
					// strict ordering of the two data messages.
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(6);
					expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(8);
					expect(postMessageMock).toHaveBeenNthCalledWith(7, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(8, mockPostMessageStatusIdle);
				});

				it('should start the scheduler with an interval', async () => {
					await scheduler.start(startData);

					expect(scheduler['timer']['timer']).toBeDefined();
				});

				it('should trigger the scheduler manually', async () => {
					await scheduler.trigger(startData);

					expect(spyGetUncertifiedBalance).toHaveBeenCalledOnce();
					expect(spyGetCertifiedBalance).toHaveBeenCalledOnce();
				});

				it('should post the wallet data when triggered without a prior start', async () => {
					// A trigger can reach a freshly created scheduler (the worker-side dispatch creates one
					// when the key is unknown), so the ref must be set by trigger itself — otherwise the
					// sync runs but its result is silently dropped.
					await scheduler.trigger(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
				});

				it('should stop the scheduler', () => {
					scheduler.stop();

					expect(scheduler['timer']['timer']).toBeUndefined();
				});

				it('should trigger syncWallet periodically', async () => {
					await scheduler.start(startData);

					// Wait for the first execution to complete
					await awaitJobExecution();

					expect(spyGetUncertifiedBalance).toHaveBeenCalledOnce();
					expect(spyGetCertifiedBalance).toHaveBeenCalledOnce();

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(2);
					expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(2);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(3);
					expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(3);
				});

				it('should postMessage with status of the worker', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledTimes(4);
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
				});

				it('should trigger postMessage with error on third try', async () => {
					// With both passes in flight, the query pass would succeed and reset the failure
					// counter before the update pass's rejection is counted.
					forceUpdateOnlyStrategy(scheduler);

					const err = new Error('test');
					signerCanisterMock.getBtcBalance.mockRejectedValue(err);

					await scheduler.start(startData);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					// idle and in_progress 3 times
					// error
					expect(postMessageMock).toHaveBeenCalledTimes(7);

					expect(postMessageMock).toHaveBeenCalledWith({
						ref,
						msg: 'syncBtcWalletError',
						data: {
							error: err
						}
					});
				});

				it('should reset the internal store when emitting an error so the next successful sync re-emits', async () => {
					forceUpdateOnlyStrategy(scheduler);

					await scheduler.start(startData);

					await awaitJobExecution();

					// Sanity check: the first sync populated the internal store.
					expect(scheduler['store'].balance).toBeDefined();

					// Force three consecutive update failures to cross the FAILURE_THRESHOLD.
					const err = new Error('Failed to fetch');
					signerCanisterMock.getBtcBalance.mockRejectedValue(err);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledWith({
						ref,
						msg: 'syncBtcWalletError',
						data: {
							error: err
						}
					});

					// After the fatal error, the in-memory store must be cleared so the next tick
					// behaves like an initial sync (mirroring the listener-side UI reset).
					expect(scheduler['store']).toEqual({
						balance: undefined,
						transactions: {},
						latestBitcoinBlockHeight: undefined,
						pendingTransactions: undefined
					});
				});
			}
		};
	};

	describe('btc-wallet worker should work', () => {
		const startData = {
			btcAddress: {
				certified: true,
				data: mockBtcAddress
			},
			shouldFetchTransactions: true,
			bitcoinNetwork: 'mainnet' as BitcoinNetwork,
			minterCanisterId: 'mqygn-kiaaa-aaaar-qaadq-cai'
		};

		const { setup, teardown, tests } = testWorker({ startData });

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});

	describe('btc-wallet worker after the warm-up (update-only syncs)', () => {
		const startData = {
			btcAddress: {
				certified: true,
				data: mockBtcAddress
			},
			shouldFetchTransactions: true,
			bitcoinNetwork: 'mainnet' as BitcoinNetwork,
			minterCanisterId: 'mqygn-kiaaa-aaaar-qaadq-cai'
		};

		const ref = mockBtcAddress;

		const lockedValue = 40n;

		const mockPendingTransaction: PendingTransaction = {
			txid: Uint8Array.from([9, 9, 9]),
			utxos: [{ ...mockUtxo, value: lockedValue }]
		};

		let scheduler: BtcWalletScheduler;
		let spyGetPendingTransactions: MockInstance;

		beforeEach(() => {
			scheduler = new BtcWalletScheduler();

			forceUpdateOnlyStrategy(scheduler);

			// Resolve right away so an awaited trigger completes its sync before the assertions.
			signerCanisterMock.getBtcBalance.mockResolvedValue(mockBalance);

			spyGetPendingTransactions = vi
				.spyOn(backendApi, 'getPendingBtcTransactions')
				.mockResolvedValue({ response: [] });
		});

		afterEach(() => {
			scheduler.stop();
		});

		it('should keep fetching the provider transactions on update-only syncs', async () => {
			await scheduler.start(startData);

			await awaitJobExecution();

			expect(blockchainRest.btcAddressData).toHaveBeenCalledOnce();
			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: true, ref })
			);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(blockchainRest.btcAddressData).toHaveBeenCalledTimes(2);
		});

		it('should subtract the UTXOs reserved by pending transactions from the certified balance', async () => {
			spyGetPendingTransactions.mockResolvedValue({ response: [mockPendingTransaction] });

			await scheduler.start(startData);

			await awaitJobExecution();

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();
			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: true, ref, locked: lockedValue })
			);
		});

		it('should subtract only the net outflow while the pending send sits in the mempool', async () => {
			// Two 2000-sat UTXOs, one of them spent by a 1000-sat send with a 100-sat fee: 900 comes
			// back as change, so the user holds 2900 even though the whole 2000 input is reserved.
			const mockMempoolPendingSend: BitcoinTransaction = {
				...mockBtcTransaction,
				hash: utxoTxIdToString(mockPendingTransaction.txid),
				block_index: null,
				inputs: [
					{
						...mockBtcTransaction.inputs[0],
						prev_out: {
							...mockBtcTransaction.inputs[0].prev_out,
							addr: mockBtcAddress,
							value: 2_000
						}
					}
				],
				out: [
					{ ...mockBtcTransaction.out[0], addr: 'recipient-address', value: 1_000 },
					{ ...mockBtcTransaction.out[0], addr: mockBtcAddress, value: 900 }
				]
			};

			vi.spyOn(blockchainRest, 'btcAddressData').mockResolvedValue({
				...mockBlockchainResponse,
				txs: [mockMempoolPendingSend]
			});
			// The canister still counts the untouched UTXO and the whole reserved one.
			signerCanisterMock.getBtcBalance.mockResolvedValue(4_000n);
			spyGetPendingTransactions.mockResolvedValue({ response: [mockPendingTransaction] });

			await scheduler.start(startData);

			await awaitJobExecution();

			expect(postMessageMock).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: 'syncBtcWallet',
					data: {
						wallet: expect.objectContaining({
							balance: {
								certified: true,
								data: {
									confirmed: 2_900n,
									unconfirmed: ZERO,
									locked: 1_100n,
									total: 2_900n
								}
							}
						})
					}
				})
			);
		});

		it('should keep fetching the pending transactions while some are pending and stop once none are left', async () => {
			spyGetPendingTransactions
				.mockResolvedValueOnce({ response: [mockPendingTransaction] })
				.mockResolvedValueOnce({ response: [mockPendingTransaction] })
				.mockResolvedValue({ response: [] });

			await scheduler.start(startData);

			await awaitJobExecution();

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(3);
			// The send confirmed and was pruned by the backend: the locked funds are released.
			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: false, ref })
			);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(3);
		});

		it('should not fetch the pending transactions on steady-state syncs when none are pending', async () => {
			await scheduler.start(startData);

			await awaitJobExecution();

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();
		});

		it('should fetch the pending transactions again when triggered after a send', async () => {
			await scheduler.start(startData);

			await awaitJobExecution();

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();

			spyGetPendingTransactions.mockResolvedValue({ response: [mockPendingTransaction] });

			await scheduler.trigger(startData);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(2);
			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: false, ref, locked: lockedValue })
			);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(3);
		});

		it('should keep fetching the pending transactions until a first fetch succeeds', async () => {
			spyGetPendingTransactions
				.mockRejectedValueOnce(new Error('test'))
				.mockResolvedValue({ response: [mockPendingTransaction] });

			await scheduler.start(startData);

			await awaitJobExecution();

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(2);
			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: false, ref, locked: lockedValue })
			);
		});

		it('should keep forcing the pending transactions when the triggers are dropped by an in-flight sync', async () => {
			// A certified balance call slower than the two post-send triggers, which are 2s apart.
			signerCanisterMock.getBtcBalance.mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve(mockBalance), 6_000))
			);

			await scheduler.start(startData);

			await vi.advanceTimersByTimeAsync(100);

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();

			spyGetPendingTransactions.mockResolvedValue({ response: [mockPendingTransaction] });

			await vi.advanceTimersByTimeAsync(1_900);
			await scheduler.trigger(startData);
			await vi.advanceTimersByTimeAsync(2_000);
			await scheduler.trigger(startData);
			await vi.advanceTimersByTimeAsync(3_000);

			// Both triggers were dropped by the timer's in-progress guard.
			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(2);
			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: false, ref, locked: lockedValue })
			);
		});

		it('should release the locked UTXOs once the provider reports the pending send as mined', async () => {
			// The pending send as the provider reports it with one confirmation at the mocked height.
			const mockMinedPendingSend: BitcoinTransaction = {
				...mockBtcTransaction,
				hash: utxoTxIdToString(mockPendingTransaction.txid),
				block_index: 1000,
				inputs: [
					{
						...mockBtcTransaction.inputs[0],
						prev_out: { ...mockBtcTransaction.inputs[0].prev_out, addr: mockBtcAddress }
					}
				],
				out: [mockBtcTransaction.out[0]]
			};

			spyGetPendingTransactions.mockResolvedValue({ response: [mockPendingTransaction] });

			await scheduler.start(startData);

			await awaitJobExecution();

			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: true, ref, locked: lockedValue })
			);

			// The send is mined: the 1-confirmation balance no longer contains its inputs, while the
			// backend keeps listing it until it is 6 blocks deep.
			vi.spyOn(blockchainRest, 'btcAddressData').mockResolvedValue({
				...mockBlockchainResponse,
				txs: [mockBtcTransaction, mockMinedPendingSend]
			});

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(2);
			expect(postMessageMock).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: 'syncBtcWallet',
					data: {
						wallet: expect.objectContaining({
							balance: {
								certified: true,
								data: {
									confirmed: mockBalance,
									unconfirmed: mockUnconfirmed,
									locked: ZERO,
									total: mockBalance + mockUnconfirmed
								}
							}
						})
					}
				})
			);

			// The mined send is now only in the store, no longer in the new transactions: the release
			// must hold, so nothing changes and nothing is posted.
			postMessageMock.mockClear();

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(scheduler['store'].balance?.data?.locked).toBe(ZERO);
			expect(postMessageMock).not.toHaveBeenCalledWith(
				expect.objectContaining({ msg: 'syncBtcWallet' })
			);
		});

		it('should compute the unconfirmed balance from the whole provider page', async () => {
			// An incoming transaction still in the mempool, which the Bitcoin canister cannot see.
			const mockUnconfirmedReceive: BitcoinTransaction = {
				...mockBtcTransaction,
				hash: 'unconfirmed-receive',
				block_index: null,
				out: [{ ...mockBtcTransaction.out[0], addr: mockBtcAddress, value: 5000 }]
			};

			vi.spyOn(blockchainRest, 'btcAddressData').mockResolvedValue({
				...mockBlockchainResponse,
				txs: [mockUnconfirmedReceive]
			});

			await scheduler.start(startData);

			await awaitJobExecution();

			const expectedBalance = {
				certified: true,
				data: {
					confirmed: mockBalance,
					unconfirmed: 5000n,
					locked: ZERO,
					total: mockBalance + 5000n
				}
			};

			expect(postMessageMock).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: 'syncBtcWallet',
					data: { wallet: expect.objectContaining({ balance: expectedBalance }) }
				})
			);

			postMessageMock.mockClear();

			// Same block height: the receive is not re-emitted, yet it must still count.
			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(scheduler['store'].balance).toEqual(expectedBalance);
			expect(postMessageMock).not.toHaveBeenCalledWith(
				expect.objectContaining({ msg: 'syncBtcWallet' })
			);
		});

		it('should retry the pending transactions after a failed fetch while some were pending', async () => {
			spyGetPendingTransactions
				.mockResolvedValueOnce({ response: [mockPendingTransaction] })
				.mockRejectedValueOnce(new Error('test'))
				.mockResolvedValue({ response: [mockPendingTransaction] });

			await scheduler.start(startData);

			await awaitJobExecution();

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(3);
		});

		it('should keep the reservations fetched by a sync whose balance call failed', async () => {
			await scheduler.start(startData);

			await awaitJobExecution();

			expect(spyGetPendingTransactions).toHaveBeenCalledOnce();

			// The post-send trigger fetches the new reservation, but the certified balance call of
			// that same sync fails: the reservation must survive, or the next sync would skip the
			// fetch (nothing forced, last known set empty) and show the spent funds as available.
			spyGetPendingTransactions.mockResolvedValue({ response: [mockPendingTransaction] });
			signerCanisterMock.getBtcBalance.mockRejectedValueOnce(new Error('test'));

			await scheduler.trigger(startData);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetPendingTransactions).toHaveBeenCalledTimes(3);
			expect(postMessageMock).toHaveBeenCalledWith(
				mockPostMessage({ certified: true, withTransactions: false, ref, locked: lockedValue })
			);
		});
	});
});
