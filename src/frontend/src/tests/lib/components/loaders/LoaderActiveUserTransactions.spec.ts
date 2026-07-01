import LoaderActiveUserTransactions from '$lib/components/loaders/LoaderActiveUserTransactions.svelte';
import {
	TRACK_COUNT_LIQUIDIUM_ERROR,
	TRACK_COUNT_LIQUIDIUM_SUCCESS,
	TRACK_COUNT_SWAP_ERROR,
	TRACK_COUNT_SWAP_SUCCESS
} from '$lib/constants/analytics.constants';
import { ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { LIQUIDIUM_PROVIDER_ID } from '$lib/constants/liquidium.constants';
import * as addressDerived from '$lib/derived/address.derived';
import * as authDerived from '$lib/derived/auth.derived';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import * as analyticsServices from '$lib/services/analytics.services';
import * as liquidiumPoller from '$lib/services/liquidium-active-tx.services';
import * as liquidiumServices from '$lib/services/liquidium.services';
import * as oneSecPoller from '$lib/services/onesec-swap.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { SwapProvider } from '$lib/types/swap';
import * as walletUtils from '$lib/utils/wallet.utils';
import {
	mockActiveUserTransaction,
	mockLiquidiumActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get, readable } from 'svelte/store';

const pending = (id: string) =>
	({
		...mockActiveUserTransaction,
		id,
		status: { Pending: null } as const
	}) satisfies typeof mockActiveUserTransaction;

const succeeded = (id: string) =>
	({
		...mockActiveUserTransaction,
		id,
		status: { Succeeded: null } as const
	}) satisfies typeof mockActiveUserTransaction;

const failed = (id: string) =>
	({
		...mockActiveUserTransaction,
		id,
		status: { Failed: null } as const
	}) satisfies typeof mockActiveUserTransaction;

const pendingLiquidium = (id: string) =>
	({
		...mockLiquidiumActiveUserTransaction,
		id,
		status: { Pending: null } as const
	}) satisfies typeof mockLiquidiumActiveUserTransaction;

const succeededLiquidium = (id: string) =>
	({
		...mockLiquidiumActiveUserTransaction,
		id,
		status: { Succeeded: null } as const
	}) satisfies typeof mockLiquidiumActiveUserTransaction;

const failedLiquidium = (id: string) =>
	({
		...mockLiquidiumActiveUserTransaction,
		id,
		status: { Failed: null } as const
	}) satisfies typeof mockLiquidiumActiveUserTransaction;

const appliedFlags = (): Record<string, true> =>
	get(activeUserTransactionsStore)?.terminalSideEffectsApplied ?? {};

describe('LoaderActiveUserTransactions', () => {
	describe('load on identity change', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
			activeUserTransactionsStore.reset();
			localStorage.clear();
		});

		it('calls loadActiveUserTransactions on mount with the current identity', async () => {
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
			const spy = vi
				.spyOn(activeUserTransactionsServices, 'loadActiveUserTransactions')
				.mockResolvedValue();

			render(LoaderActiveUserTransactions);

			await waitFor(() => {
				expect(spy).toHaveBeenCalledWith({ identity: mockIdentity });
			});
		});

		it('delegates the sign-out branch to the service (which resets the store on nullish identity)', async () => {
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(null));
			const spy = vi
				.spyOn(activeUserTransactionsServices, 'loadActiveUserTransactions')
				.mockResolvedValue();
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({
				transaction: mockActiveUserTransaction
			});

			render(LoaderActiveUserTransactions);

			await waitFor(() => {
				expect(spy).toHaveBeenCalledWith({ identity: null });
			});
		});
	});

	describe('polling', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.restoreAllMocks();
			activeUserTransactionsStore.reset();
			localStorage.clear();
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
			vi.spyOn(activeUserTransactionsServices, 'loadActiveUserTransactions').mockResolvedValue();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('does nothing while there are no pending rows', async () => {
			const spy = vi.spyOn(oneSecPoller, 'pollOneSecActiveUserTransactions').mockResolvedValue();

			render(LoaderActiveUserTransactions);

			await vi.advanceTimersByTimeAsync(ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS * 2);

			expect(spy).not.toHaveBeenCalled();
		});

		it('polls OneSec rows on each tick when present', async () => {
			const spy = vi.spyOn(oneSecPoller, 'pollOneSecActiveUserTransactions').mockResolvedValue();

			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pending('a') });

			render(LoaderActiveUserTransactions);

			await vi.advanceTimersByTimeAsync(ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS);

			expect(spy).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					transactions: [pending('a')]
				})
			);

			await vi.advanceTimersByTimeAsync(ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS);

			expect(spy).toHaveBeenCalledTimes(2);
		});

		it('polls Liquidium rows on each tick when present', async () => {
			const oneSecSpy = vi
				.spyOn(oneSecPoller, 'pollOneSecActiveUserTransactions')
				.mockResolvedValue();
			const liquidiumSpy = vi
				.spyOn(liquidiumPoller, 'pollLiquidiumActiveUserTransactions')
				.mockResolvedValue();
			const tx = pendingLiquidium('liquidium-a');

			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: tx });

			render(LoaderActiveUserTransactions);

			await vi.advanceTimersByTimeAsync(ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS);

			expect(oneSecSpy).not.toHaveBeenCalled();
			expect(liquidiumSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				transactions: [tx]
			});
		});

		it('stops polling once all rows reach a terminal state', async () => {
			const spy = vi.spyOn(oneSecPoller, 'pollOneSecActiveUserTransactions').mockResolvedValue();

			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pending('a') });

			render(LoaderActiveUserTransactions);

			await vi.advanceTimersByTimeAsync(ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS);

			expect(spy).toHaveBeenCalledOnce();

			activeUserTransactionsStore.upsert({
				transaction: { ...pending('a'), status: { Succeeded: null } }
			});

			await vi.advanceTimersByTimeAsync(ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS * 3);

			expect(spy).toHaveBeenCalledOnce();
		});

		it('does not poll when the identity is nullish', async () => {
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(null));
			const spy = vi.spyOn(oneSecPoller, 'pollOneSecActiveUserTransactions').mockResolvedValue();

			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pending('a') });

			render(LoaderActiveUserTransactions);

			await vi.advanceTimersByTimeAsync(ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS * 2);

			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe('terminal-state side-effects', () => {
		let refreshSpy: ReturnType<typeof vi.spyOn>;
		let trackEventSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.restoreAllMocks();
			localStorage.clear();
			activeUserTransactionsStore.reset();
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
			vi.spyOn(activeUserTransactionsServices, 'loadActiveUserTransactions').mockResolvedValue();
			refreshSpy = vi.spyOn(walletUtils, 'waitAndTriggerWallet').mockResolvedValue();
			trackEventSpy = vi.spyOn(analyticsServices, 'trackEvent').mockReturnValue(undefined);
		});

		it('fires waitAndTriggerWallet and a swap_success event once when a row transitions to Succeeded', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pending('a') });

			render(LoaderActiveUserTransactions);
			await tick();

			expect(refreshSpy).not.toHaveBeenCalled();
			expect(trackEventSpy).not.toHaveBeenCalled();

			activeUserTransactionsStore.upsert({ transaction: succeeded('a') });
			await tick();

			expect(refreshSpy).toHaveBeenCalledOnce();
			expect(trackEventSpy).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_SWAP_SUCCESS,
				metadata: expect.objectContaining({ dApp: SwapProvider.ONE_SEC })
			});
			expect(appliedFlags()).toEqual({ a: true });
		});

		it('fires wallet and Liquidium refreshes plus analytics when a Liquidium row succeeds', async () => {
			const loadLiquidiumSpy = vi.spyOn(liquidiumServices, 'loadLiquidium').mockResolvedValue();
			vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));

			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pendingLiquidium('liquidium-a') });

			render(LoaderActiveUserTransactions);
			await tick();

			expect(refreshSpy).not.toHaveBeenCalled();
			expect(loadLiquidiumSpy).not.toHaveBeenCalled();
			expect(trackEventSpy).not.toHaveBeenCalled();

			activeUserTransactionsStore.upsert({ transaction: succeededLiquidium('liquidium-a') });
			await tick();

			expect(refreshSpy).toHaveBeenCalledOnce();
			expect(loadLiquidiumSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ethAddress: mockEthAddress
			});
			expect(trackEventSpy).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_LIQUIDIUM_SUCCESS,
				metadata: {
					dApp: LIQUIDIUM_PROVIDER_ID,
					action: 'supply',
					token: 'BTC',
					tokenAmount: '1'
				}
			});
			expect(appliedFlags()).toEqual({ 'liquidium-a': true });
		});

		it('fires Liquidium error analytics without refreshing balances when a Liquidium row fails', async () => {
			const loadLiquidiumSpy = vi.spyOn(liquidiumServices, 'loadLiquidium').mockResolvedValue();

			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pendingLiquidium('liquidium-a') });

			render(LoaderActiveUserTransactions);
			await tick();

			activeUserTransactionsStore.upsert({ transaction: failedLiquidium('liquidium-a') });
			await tick();

			expect(refreshSpy).not.toHaveBeenCalled();
			expect(loadLiquidiumSpy).not.toHaveBeenCalled();
			expect(trackEventSpy).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_LIQUIDIUM_ERROR,
				metadata: expect.objectContaining({
					dApp: LIQUIDIUM_PROVIDER_ID,
					action: 'supply',
					token: 'BTC',
					tokenAmount: '1'
				})
			});
			expect(appliedFlags()).toEqual({ 'liquidium-a': true });
		});

		it('fires a swap_error event (and no wallet refresh) when a row transitions to Failed', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pending('a') });

			render(LoaderActiveUserTransactions);
			await tick();

			activeUserTransactionsStore.upsert({ transaction: failed('a') });
			await tick();

			expect(refreshSpy).not.toHaveBeenCalled();
			expect(trackEventSpy).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: expect.objectContaining({ dApp: SwapProvider.ONE_SEC })
			});
			expect(appliedFlags()).toEqual({ a: true });
		});

		it('does not re-fire on subsequent store updates that touch an already-flagged row', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: succeeded('a') });

			render(LoaderActiveUserTransactions);
			await tick();

			expect(refreshSpy).toHaveBeenCalledOnce();
			expect(trackEventSpy).toHaveBeenCalledOnce();

			activeUserTransactionsStore.upsert({ transaction: succeeded('a') });
			await tick();

			expect(refreshSpy).toHaveBeenCalledOnce();
			expect(trackEventSpy).toHaveBeenCalledOnce();
		});

		it('coalesces multiple Succeeded transitions in one update into a single refresh and one event per row', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());

			render(LoaderActiveUserTransactions);
			await tick();

			activeUserTransactionsStore.set({
				transactions: [succeeded('a'), succeeded('b'), succeeded('c')]
			});
			await tick();

			expect(refreshSpy).toHaveBeenCalledOnce();
			expect(trackEventSpy).toHaveBeenCalledTimes(3);
			expect(appliedFlags()).toEqual({ a: true, b: true, c: true });
		});

		it('does not fire when the row is loaded with a terminal status that was already flagged', async () => {
			const principal = mockIdentity.getPrincipal();
			localStorage.setItem(
				`aut:state:${principal.toText()}`,
				JSON.stringify({
					lastSeenUpdatedAtNs: {},
					terminalSideEffectsApplied: { a: true }
				})
			);
			activeUserTransactionsStore.init(principal);
			activeUserTransactionsStore.upsert({ transaction: succeeded('a') });

			render(LoaderActiveUserTransactions);
			await tick();

			expect(refreshSpy).not.toHaveBeenCalled();
			expect(trackEventSpy).not.toHaveBeenCalled();
		});

		it('does not fire wallet refresh for non-Succeeded statuses', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pending('a') });
			activeUserTransactionsStore.upsert({
				transaction: { ...pending('b'), status: { Executing: null } }
			});

			render(LoaderActiveUserTransactions);
			await tick();

			expect(refreshSpy).not.toHaveBeenCalled();
			expect(trackEventSpy).not.toHaveBeenCalled();
			expect(appliedFlags()).toEqual({});
		});

		it('prunes flags for rows that no longer exist in the store (via store.set)', async () => {
			const principal = mockIdentity.getPrincipal();
			localStorage.setItem(
				`aut:state:${principal.toText()}`,
				JSON.stringify({
					lastSeenUpdatedAtNs: {},
					terminalSideEffectsApplied: { a: true, b: true }
				})
			);
			activeUserTransactionsStore.init(principal);
			activeUserTransactionsStore.set({ transactions: [succeeded('a')] });

			render(LoaderActiveUserTransactions);
			await tick();

			expect(appliedFlags()).toEqual({ a: true });
		});
	});
});
