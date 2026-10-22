import type { GetActiveUserTransactionsResponse } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { activeUserTransactionsList } from '$lib/derived/active-user-transactions.derived';
import {
	applyActiveUserTransactionPollUpdate,
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	loadActiveUserTransactions,
	markActiveUserTransactionsSeen,
	reloadActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import {
	mockActiveUserTransaction,
	mockActiveUserTransactionErrorNotFound,
	mockActiveUserTransactionId,
	mockCreateActiveUserTransactionParams,
	mockUpdateActiveUserTransactionParams
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api', () => ({
	createActiveUserTransaction: vi.fn(),
	updateActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn(),
	getActiveUserTransactions: vi.fn(),
	markActiveUserTransactionsSeen: vi.fn()
}));

describe('active-user-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		activeUserTransactionsStore.reset();
		localStorage.clear();
	});

	describe('loadActiveUserTransactions', () => {
		it('should reset the store and skip the API call when identity is nullish', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({
				transaction: mockActiveUserTransaction
			});

			await loadActiveUserTransactions({ identity: null });

			expect(backendApi.getActiveUserTransactions).not.toHaveBeenCalled();
			expect(get(activeUserTransactionsStore)).toBeUndefined();
		});

		it('should init the store and prime it on success', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue({
				transactions: [mockActiveUserTransaction],
				seen_up_to_ns: ZERO
			});

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});

		it('should keep the seen mark the backend returns', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue({
				transactions: [mockActiveUserTransaction],
				seen_up_to_ns: mockActiveUserTransaction.updated_at_ns
			});

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(
				mockActiveUserTransaction.updated_at_ns
			);
		});

		it('should swallow API errors and leave the store empty', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		// The race the merge exists for: a record created while the load's read is in flight is in the
		// store before the older snapshot lands, and must still be there afterwards — for an XRP send
		// the record is the only thing that ever reports the payment's outcome.
		it('keeps a record created while the load is in flight', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());

			let resolveLoad: (response: GetActiveUserTransactionsResponse) => void = () => {};
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockResolvedValueOnce(
				mockActiveUserTransaction
			);

			const inFlight = loadActiveUserTransactions({ identity: mockIdentity });

			await createActiveUserTransaction({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});

			// The snapshot was read before the create committed, so it does not have the row.
			resolveLoad({ transactions: [], seen_up_to_ns: ZERO });
			await inFlight;

			expect(get(activeUserTransactionsStore)?.data[mockActiveUserTransaction.id]).toEqual(
				mockActiveUserTransaction
			);
		});

		// The account switched while the read was in flight: the snapshot and its marks are the
		// previous account's, and both marks only move forward.
		it('keeps a late response out of the store of another account', async () => {
			let resolveLoad: (response: GetActiveUserTransactionsResponse) => void = () => {};
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);

			const inFlight = loadActiveUserTransactions({ identity: mockIdentity });

			activeUserTransactionsStore.init(mockPrincipal2);
			resolveLoad({
				transactions: [{ ...mockActiveUserTransaction, updated_at_ns: 7n }],
				seen_up_to_ns: 7n
			});
			await inFlight;

			const state = get(activeUserTransactionsStore);

			expect(state?.data).toEqual({});
			expect(state?.seenUpToNs).toBe(ZERO);
			expect(state?.loadedUpToNs).toBe(ZERO);
		});

		// Two loads of the same account finish out of order: the older one, applied last, lacks a row the
		// newer one had, so the list no longer shows it and the cutoff must not cover it.
		it('takes the cutoff from the snapshot it applied last when loads finish out of order', async () => {
			const a = { ...mockActiveUserTransaction, id: 'a', updated_at_ns: 5n };
			const b = { ...mockActiveUserTransaction, id: 'b', updated_at_ns: 7n };
			let resolveOlder: (response: GetActiveUserTransactionsResponse) => void = () => {};
			let resolveNewer: (response: GetActiveUserTransactionsResponse) => void = () => {};
			vi.spyOn(backendApi, 'getActiveUserTransactions')
				.mockReturnValueOnce(
					new Promise((resolve) => {
						resolveOlder = resolve;
					})
				)
				.mockReturnValueOnce(
					new Promise((resolve) => {
						resolveNewer = resolve;
					})
				);

			const older = loadActiveUserTransactions({ identity: mockIdentity });
			const newer = loadActiveUserTransactions({ identity: mockIdentity });

			resolveNewer({ transactions: [a, b], seen_up_to_ns: ZERO });
			await newer;
			resolveOlder({ transactions: [a], seen_up_to_ns: ZERO });
			await older;

			const state = get(activeUserTransactionsStore);

			expect(Object.keys(state?.data ?? {})).toEqual(['a']);
			expect(state?.loadedUpToNs).toBe(5n);
		});

		it('drops a late response when the store has been reset mid-flight', async () => {
			// Simulates: load(A) issues getActiveUserTransactions; before the
			// response lands, the user signs out and the store is reset. A's
			// late response must not resurrect data after the reset.
			let resolveLoad: (response: GetActiveUserTransactionsResponse) => void = () => {};
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);

			const inFlight = loadActiveUserTransactions({ identity: mockIdentity });

			// Sign-out fires the reset path before A's response arrives.
			activeUserTransactionsStore.reset();

			resolveLoad({ transactions: [mockActiveUserTransaction], seen_up_to_ns: ZERO });
			await inFlight;

			expect(get(activeUserTransactionsStore)).toBeUndefined();
		});
	});

	describe('createActiveUserTransaction', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		});

		it('should forward params and upsert into the store on success', async () => {
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			await createActiveUserTransaction({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});

			expect(backendApi.createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});
			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});

		// The account switched while the call was in flight: the row is not this account's.
		it('should not upsert into the store of another account', async () => {
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);
			activeUserTransactionsStore.init(mockPrincipal2);

			await createActiveUserTransaction({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});

			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		it('should propagate API errors so callers can surface them', async () => {
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				createActiveUserTransaction({
					identity: mockIdentity,
					...mockCreateActiveUserTransactionParams
				})
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
			expect(get(activeUserTransactionsList)).toEqual([]);
		});
	});

	describe('updateActiveUserTransaction', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		});

		it('should forward params and upsert into the store on success', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			await updateActiveUserTransaction({
				identity: mockIdentity,
				...mockUpdateActiveUserTransactionParams
			});

			expect(backendApi.updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				...mockUpdateActiveUserTransactionParams
			});
			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});

		// The account switched while the call was in flight: that account's loader would report the
		// row as its own.
		it('should not upsert into the store of another account', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);
			activeUserTransactionsStore.init(mockPrincipal2);

			await updateActiveUserTransaction({
				identity: mockIdentity,
				...mockUpdateActiveUserTransactionParams
			});

			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		it('should propagate API errors so callers can surface them', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				updateActiveUserTransaction({
					identity: mockIdentity,
					...mockUpdateActiveUserTransactionParams
				})
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
		});

		// The write can commit after this tab is gone, before anything reported the outcome. The next
		// session in this browser must then report it rather than claim it.
		describe('a terminal status', () => {
			const settled = { ...mockActiveUserTransaction, status: { Succeeded: null } };

			const claimedOnNextLoad = (): boolean => {
				activeUserTransactionsStore.reset();
				activeUserTransactionsStore.init(mockIdentity.getPrincipal());
				activeUserTransactionsStore.set({ transactions: [settled] });

				return get(activeUserTransactionsStore)?.terminalSideEffectsApplied[settled.id] === true;
			};

			// The canister refused the write, so it never committed.
			it('stops being recorded when the canister refuses the write', async () => {
				vi.spyOn(backendApi, 'updateActiveUserTransaction').mockRejectedValue({
					IllegalStatusTransition: null
				});

				await expect(
					updateActiveUserTransaction({
						identity: mockIdentity,
						id: settled.id,
						status: settled.status
					})
				).rejects.toEqual({ IllegalStatusTransition: null });

				expect(claimedOnNextLoad()).toBeTruthy();
			});

			// The write may still have committed.
			it('stays recorded when the call fails without an answer from the canister', async () => {
				vi.spyOn(backendApi, 'updateActiveUserTransaction').mockRejectedValue(new Error('network'));

				await expect(
					updateActiveUserTransaction({
						identity: mockIdentity,
						id: settled.id,
						status: settled.status
					})
				).rejects.toThrow('network');

				expect(claimedOnNextLoad()).toBeFalsy();
			});

			// The OISY Trade foreground reports its swap itself.
			it('is not recorded when the caller reports the outcome itself', async () => {
				vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(settled);

				await updateActiveUserTransaction({
					identity: mockIdentity,
					id: settled.id,
					status: settled.status,
					outcomeReportedByCaller: true
				});

				expect(backendApi.updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: settled.id,
					status: settled.status
				});
				expect(claimedOnNextLoad()).toBeTruthy();
			});

			it('is recorded as sent before the write resolves', () => {
				vi.spyOn(backendApi, 'updateActiveUserTransaction').mockReturnValueOnce(
					new Promise(() => {})
				);

				updateActiveUserTransaction({
					identity: mockIdentity,
					id: settled.id,
					status: settled.status
				});

				expect(claimedOnNextLoad()).toBeFalsy();
			});

			// A sign-out while a poll awaited its external call resets the store before the write.
			it('is recorded for the identity that sends it when the store was reset', async () => {
				vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(settled);
				activeUserTransactionsStore.reset();

				await updateActiveUserTransaction({
					identity: mockIdentity,
					id: settled.id,
					status: settled.status
				});

				expect(claimedOnNextLoad()).toBeFalsy();
			});

			it('is recorded for the identity that sends it when the store holds another account', async () => {
				vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(settled);
				activeUserTransactionsStore.init(mockPrincipal2);

				await updateActiveUserTransaction({
					identity: mockIdentity,
					id: settled.id,
					status: settled.status
				});

				expect(claimedOnNextLoad()).toBeFalsy();
			});
		});

		it('does not record a status that is not terminal', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			await updateActiveUserTransaction({
				identity: mockIdentity,
				id: mockActiveUserTransactionId,
				status: { Executing: null }
			});

			activeUserTransactionsStore.reset();
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.set({
				transactions: [{ ...mockActiveUserTransaction, status: { Succeeded: null } }]
			});

			expect(
				get(activeUserTransactionsStore)?.terminalSideEffectsApplied[mockActiveUserTransactionId]
			).toBeTruthy();
		});
	});

	describe('deleteActiveUserTransaction', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({
				transaction: mockActiveUserTransaction
			});
		});

		it('should call the API and remove the row from the store on success', async () => {
			vi.spyOn(backendApi, 'deleteActiveUserTransaction').mockResolvedValue(undefined);

			await deleteActiveUserTransaction({
				identity: mockIdentity,
				id: mockActiveUserTransactionId
			});

			expect(backendApi.deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: mockActiveUserTransactionId
			});
			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		it('should leave the store untouched if the API rejects', async () => {
			vi.spyOn(backendApi, 'deleteActiveUserTransaction').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				deleteActiveUserTransaction({
					identity: mockIdentity,
					id: mockActiveUserTransactionId
				})
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});
	});

	describe('markActiveUserTransactionsSeen', () => {
		const older = { ...mockActiveUserTransaction, id: 'older', updated_at_ns: 5n };
		const latest = { ...mockActiveUserTransaction, id: 'latest', updated_at_ns: 7n };

		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.set({ transactions: [older, latest] });
		});

		it('marks every row seen here, and up to the latest update for the other devices', async () => {
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockResolvedValue(7n);

			await markActiveUserTransactionsSeen({ identity: mockIdentity });

			expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({
				older: '5',
				latest: '7'
			});
			expect(backendApi.markActiveUserTransactionsSeen).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				upToNs: 7n
			});
			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(7n);
		});

		// This device wrote a row after its load, and another device may have created one in between
		// that this list never had: the mark must not cover that one.
		it('marks for the other devices only up to the latest load', async () => {
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockResolvedValue(7n);
			activeUserTransactionsStore.upsert({
				transaction: { ...mockActiveUserTransaction, id: 'written-here', updated_at_ns: 9n }
			});

			await markActiveUserTransactionsSeen({ identity: mockIdentity });

			expect(backendApi.markActiveUserTransactionsSeen).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				upToNs: 7n
			});
			expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs['written-here']).toBe('9');
		});

		// The account switched while the call was in flight: the answer is the previous account's.
		it('does not apply the answer to the store of another account', async () => {
			let resolveMark: (seenUpToNs: bigint) => void = () => {};
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveMark = resolve;
				})
			);

			const inFlight = markActiveUserTransactionsSeen({ identity: mockIdentity });

			activeUserTransactionsStore.init(mockPrincipal2);
			resolveMark(7n);
			await inFlight;

			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(ZERO);
		});

		// Another device marked further in the meantime.
		it('keeps the later mark the backend answers with', async () => {
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockResolvedValue(9n);

			await markActiveUserTransactionsSeen({ identity: mockIdentity });

			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(9n);
		});

		it('does not call the backend when nothing changed since its mark', async () => {
			activeUserTransactionsStore.setSeenUpTo({ seenUpToNs: 7n });

			await markActiveUserTransactionsSeen({ identity: mockIdentity });

			expect(backendApi.markActiveUserTransactionsSeen).not.toHaveBeenCalled();
		});

		it('marks the rows seen here without an identity', async () => {
			await markActiveUserTransactionsSeen({ identity: null });

			expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({
				older: '5',
				latest: '7'
			});
			expect(backendApi.markActiveUserTransactionsSeen).not.toHaveBeenCalled();
		});

		it('keeps the mark made here when the backend call fails', async () => {
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				markActiveUserTransactionsSeen({ identity: mockIdentity })
			).resolves.toBeUndefined();

			expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({
				older: '5',
				latest: '7'
			});
			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(ZERO);
		});
	});

	describe('reloadActiveUserTransaction', () => {
		const staleTransaction = mockActiveUserTransaction;
		const freshTransaction = {
			...mockActiveUserTransaction,
			external_refs: [{ key: 'tx_hash', value: '0xhash' }],
			updated_at_ns: 2n
		};

		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: staleTransaction });
		});

		it('should return the backend row and replace the stale copy in the store', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue({
				transactions: [freshTransaction],
				seen_up_to_ns: ZERO
			});

			await expect(
				reloadActiveUserTransaction({ identity: mockIdentity, id: mockActiveUserTransactionId })
			).resolves.toEqual(freshTransaction);

			// Certified: the answer decides whether a row is deleted.
			expect(backendApi.getActiveUserTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				certified: true
			});
			expect(get(activeUserTransactionsList)).toEqual([freshTransaction]);
		});

		it('should return undefined and leave the store untouched when the backend has no such row', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue({
				transactions: [],
				seen_up_to_ns: ZERO
			});

			await expect(
				reloadActiveUserTransaction({ identity: mockIdentity, id: mockActiveUserTransactionId })
			).resolves.toBeUndefined();

			expect(get(activeUserTransactionsList)).toEqual([staleTransaction]);
		});

		// The account switched while the call was in flight: the row is not this account's.
		it('should not upsert into the store of another account', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue({
				transactions: [freshTransaction],
				seen_up_to_ns: ZERO
			});
			activeUserTransactionsStore.init(mockPrincipal2);

			await reloadActiveUserTransaction({
				identity: mockIdentity,
				id: mockActiveUserTransactionId
			});

			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		it('should propagate API errors so callers do not act on a stale copy', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				reloadActiveUserTransaction({ identity: mockIdentity, id: mockActiveUserTransactionId })
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
			expect(get(activeUserTransactionsList)).toEqual([staleTransaction]);
		});
	});

	describe('applyActiveUserTransactionPollUpdate', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		});

		it('does nothing when update is undefined', async () => {
			await expect(
				applyActiveUserTransactionPollUpdate({
					identity: mockIdentity,
					tx: mockActiveUserTransaction,
					update: undefined
				})
			).resolves.toBeFalsy();

			expect(backendApi.updateActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('skips no-op updates', async () => {
			await expect(
				applyActiveUserTransactionPollUpdate({
					identity: mockIdentity,
					tx: mockActiveUserTransaction,
					update: {}
				})
			).resolves.toBeFalsy();

			expect(backendApi.updateActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('forwards the update when something changes, and reports it written', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			await expect(
				applyActiveUserTransactionPollUpdate({
					identity: mockIdentity,
					tx: mockActiveUserTransaction,
					update: { status: { Succeeded: null }, progressStep: 'done' }
				})
			).resolves.toBeTruthy();

			expect(backendApi.updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: mockActiveUserTransaction.id,
				status: { Succeeded: null },
				progressStep: 'done'
			});
		});

		it('swallows backend errors so the next tick can retry, reporting nothing written', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockRejectedValue(new Error('boom'));

			await expect(
				applyActiveUserTransactionPollUpdate({
					identity: mockIdentity,
					tx: mockActiveUserTransaction,
					update: { status: { Succeeded: null } }
				})
			).resolves.toBeFalsy();
		});
	});
});
