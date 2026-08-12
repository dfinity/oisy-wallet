import SimulatedFailuresRunner from '$icp/components/core/SimulatedFailuresRunner.svelte';
import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { TokenId } from '$lib/types/token';
import { simulatedFailuresStore } from '$lib/utils/simulated-canister-failures.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('SimulatedFailuresRunner', () => {
	// The token id is what the harness matches on, and the app derives it from the symbol
	// (`parseTokenId(symbol)` in `icrc.utils`). The mock hardcodes an unrelated one.
	const token: IcrcCustomToken = {
		...mockValidIcToken,
		id: parseTokenId('PANDA'),
		symbol: 'PANDA',
		version: 1n,
		enabled: true
	};

	let tokenId: TokenId;

	beforeEach(() => {
		vi.useFakeTimers();

		setupUserNetworksStore('allEnabled');

		icTransactionsStatusStore.reset();
		simulatedFailuresStore.set({ indexSymbols: [], ledgerSymbols: [] });

		icrcCustomTokensStore.resetAll();
		icrcCustomTokensStore.setAll([{ data: token, certified: true }]);

		const id = get(icrcCustomTokensStore)?.at(0)?.data.id;
		assertNonNullish(id);
		tokenId = id;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should not count anything when nothing is simulated', async () => {
		render(SimulatedFailuresRunner);

		await tick();

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS * 3);

		expect(get(icTransactionsStatusStore)[tokenId]).toBeUndefined();
	});

	it('should count one failure per wallet cycle for a simulated token', async () => {
		simulatedFailuresStore.set({ indexSymbols: ['PANDA'], ledgerSymbols: [] });

		render(SimulatedFailuresRunner);

		await tick();

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

		expect(get(icTransactionsStatusStore)[tokenId]).toBe(1);

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS * 2);

		expect(get(icTransactionsStatusStore)[tokenId]).toBe(3);
	});

	it('should reset the count of a token that is no longer simulated', async () => {
		simulatedFailuresStore.set({ indexSymbols: ['PANDA'], ledgerSymbols: [] });

		render(SimulatedFailuresRunner);

		await tick();

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS * 3);

		expect(get(icTransactionsStatusStore)[tokenId]).toBe(3);

		simulatedFailuresStore.set({ indexSymbols: [], ledgerSymbols: [] });

		// A quiet token gets no real sync to reset it, so the harness has to, on its next tick.
		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

		expect(get(icTransactionsStatusStore)[tokenId]).toBe(0);
	});

	it('should not touch a token failing outside the simulation', async () => {
		icTransactionsStatusStore.fail(tokenId);
		icTransactionsStatusStore.fail(tokenId);

		render(SimulatedFailuresRunner);

		await tick();

		simulatedFailuresStore.set({ indexSymbols: [], ledgerSymbols: [] });

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS * 3);

		expect(get(icTransactionsStatusStore)[tokenId]).toBe(2);
	});

	it('should stop counting once unmounted', async () => {
		simulatedFailuresStore.set({ indexSymbols: ['PANDA'], ledgerSymbols: [] });

		const { unmount } = render(SimulatedFailuresRunner);

		await tick();

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

		unmount();

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS * 3);

		expect(get(icTransactionsStatusStore)[tokenId]).toBe(1);
	});
});
