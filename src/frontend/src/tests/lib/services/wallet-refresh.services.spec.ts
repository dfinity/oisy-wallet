import {
	cancelWalletRefresh,
	refreshWallet,
	registerWalletRefresh
} from '$lib/services/wallet-refresh.services';

describe('Wallet refresh', () => {
	const disposers: (() => void)[] = [];
	const register = ({
		kind,
		refresh = vi.fn((_signal: AbortSignal) => Promise.resolve())
	}: {
		kind: 'wallet' | 'evm' | 'prices';
		refresh?: ReturnType<typeof vi.fn<(signal: AbortSignal) => Promise<void>>>;
	}) => {
		disposers.push(registerWalletRefresh({ kind, refresh }));
		return refresh;
	};
	const ready = () => {
		register({ kind: 'evm' });
		register({ kind: 'prices' });
	};

	beforeEach(() => vi.useFakeTimers());

	afterEach(() => {
		cancelWalletRefresh();
		disposers.splice(0).forEach((dispose) => dispose());
		vi.useRealTimers();
	});

	it('rejects before the wallet owners mount', async () => {
		await expect(refreshWallet()).rejects.toThrow('not ready');
	});

	it('coalesces pulls and waits for every existing owner, even when no data changes', async () => {
		let finish: () => void = () => {};
		const wallet = register({
			kind: 'wallet',
			refresh: vi.fn(
				() =>
					new Promise<void>((resolve) => {
						finish = resolve;
					})
			)
		});
		const evm = register({ kind: 'evm' });
		const prices = register({ kind: 'prices' });
		const first = refreshWallet();

		expect(refreshWallet()).toBe(first);

		const settled = vi.fn();
		void first.then(settled);
		await vi.advanceTimersByTimeAsync(0);

		expect(settled).not.toHaveBeenCalled();
		expect(wallet).toHaveBeenCalledOnce();
		expect(evm).toHaveBeenCalledOnce();
		expect(prices).toHaveBeenCalledOnce();

		finish();
		await first;

		expect(settled).toHaveBeenCalledOnce();

		wallet.mockResolvedValue(undefined);
		await refreshWallet();
	});

	it('aggregates owner errors after the other owners finish', async () => {
		const failure = new Error('RPC unavailable');
		register({ kind: 'wallet', refresh: vi.fn(() => Promise.reject(failure)) });
		let finish: () => void = () => {};
		register({
			kind: 'evm',
			refresh: vi.fn(
				() =>
					new Promise<void>((resolve) => {
						finish = resolve;
					})
			)
		});
		register({ kind: 'prices' });
		const outcome = refreshWallet().catch((error: unknown) => error);
		await vi.advanceTimersByTimeAsync(0);
		finish();
		const error = await outcome;

		expect(error).toBeInstanceOf(AggregateError);
		expect((error as AggregateError).errors).toEqual([failure]);
	});

	it('cancels a refresh when its owner is disposed and permits a later attempt', async () => {
		ready();
		register({ kind: 'wallet', refresh: vi.fn(() => new Promise<void>(() => {})) });
		const result = refreshWallet();
		const outcome = result.catch((error: unknown) => error);
		disposers.pop()?.();

		await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });

		register({ kind: 'wallet' });

		await expect(refreshWallet()).resolves.toBeUndefined();
	});

	it('ends hung providers at fifteen seconds and aborts their response listeners', async () => {
		ready();
		const wallet = register({ kind: 'wallet', refresh: vi.fn(() => new Promise<void>(() => {})) });
		const result = refreshWallet();
		const outcome = result.catch((error: unknown) => error);
		await vi.advanceTimersByTimeAsync(15_000);

		await expect(outcome).resolves.toMatchObject({ name: 'TimeoutError' });

		expect(wallet.mock.calls[0][0].aborted).toBeTruthy();
	});

	it('cancels explicitly on session teardown', async () => {
		ready();
		register({ kind: 'wallet', refresh: vi.fn(() => new Promise<void>(() => {})) });
		const result = refreshWallet();
		const outcome = result.catch((error: unknown) => error);
		cancelWalletRefresh();

		await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });
	});
});
