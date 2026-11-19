import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import UserSnapshotWorker from '$lib/components/rewards/UserSnapshotWorker.svelte';
import * as authDerived from '$lib/derived/auth.derived';
import * as balancesDerived from '$lib/derived/balances.derived';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import { registerUserSnapshot } from '$lib/services/user-snapshot.services';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/services/user-snapshot.services', () => ({
	registerUserSnapshot: vi.fn()
}));

describe('UserSnapshotWorker', () => {
	// Longer than the worker's debounce, far shorter than its periodic send.
	const DEBOUNCE_ELAPSED_MS = 1_000;

	const mockXrpTransaction: XrpTransactionUi = {
		id: 'HASH1',
		type: 'receive',
		status: 'confirmed',
		value: 1_000_000n,
		from: 'rSender',
		to: mockXrpAddress,
		timestamp: 1n
	};

	const renderAndTakeFirstSnapshot = async () => {
		render(UserSnapshotWorker);

		await vi.advanceTimersByTimeAsync(0);

		expect(registerUserSnapshot).toHaveBeenCalledOnce();
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		xrpAddressMainnetStore.reset();
		xrpTransactionsStore.reset(XRP_TOKEN.id);

		vi.spyOn(authDerived, 'authSignedIn', 'get').mockImplementation(() => readable(true));
		vi.spyOn(authDerived, 'authNotSignedIn', 'get').mockImplementation(() => readable(false));
		vi.spyOn(tokensDerived, 'tokens', 'get').mockImplementation(() => readable([XRP_TOKEN]));
		vi.spyOn(exchangeDerived, 'exchangeNotInitialized', 'get').mockImplementation(() =>
			readable(false)
		);
		vi.spyOn(balancesDerived, 'noPositiveBalanceAndNotAllBalancesZero', 'get').mockImplementation(
			() => readable(false)
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should re-send the snapshot when the XRP address loads', async () => {
		await renderAndTakeFirstSnapshot();

		xrpAddressMainnetStore.set({ data: mockXrpAddress, certified: true });

		await vi.advanceTimersByTimeAsync(DEBOUNCE_ELAPSED_MS);

		expect(registerUserSnapshot).toHaveBeenCalledTimes(2);
	});

	it('should re-send the snapshot when the first XRP transactions load', async () => {
		await renderAndTakeFirstSnapshot();

		xrpTransactionsStore.prepend({
			tokenId: XRP_TOKEN.id,
			transactions: [{ data: mockXrpTransaction, certified: false }]
		});

		await vi.advanceTimersByTimeAsync(DEBOUNCE_ELAPSED_MS);

		expect(registerUserSnapshot).toHaveBeenCalledTimes(2);
	});
});
