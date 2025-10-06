import { IC_CKETH_MINTER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import IcCkListener from '$icp/components/core/IcCkListener.svelte';
import { CKETH_MINTER_INFO_TIMER } from '$icp/constants/cketh.constants';
import { emit } from '$lib/utils/events.utils';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('IcCkListener', () => {
	const stop = vi.fn();
	const start = vi.fn();
	const trigger = vi.fn();
	const destroy = vi.fn();

	const initFn = vi.fn(
		async () =>
			await Promise.resolve({
				stop,
				start,
				trigger,
				destroy
			})
	);

	const awaitTimer = () => vi.advanceTimersByTimeAsync(CKETH_MINTER_INFO_TIMER * 10);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should initialize the worker on mount', async () => {
		const token = mockValidIcCkToken;
		const { twinToken } = mockValidIcCkToken;

		render(IcCkListener, {
			initFn,
			token,
			twinToken,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith({
			token,
			twinToken,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});
	});

	it('should initialize the worker only once', async () => {
		const token = mockValidIcCkToken;
		const { twinToken } = mockValidIcCkToken;

		render(IcCkListener, {
			initFn,
			token,
			twinToken,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith({
			token,
			twinToken,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith();
	});

	it('should initialize the worker without minterCanisterId', async () => {
		const token = mockValidIcCkToken;
		const { twinToken } = mockValidIcCkToken;

		render(IcCkListener, {
			initFn,
			token,
			twinToken
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith({
			token,
			twinToken,
			minterCanisterId: token.minterCanisterId
		});
	});

	it('should initialize the worker without twinToken', async () => {
		const token = mockValidIcCkToken;

		render(IcCkListener, {
			initFn,
			token,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith({
			token,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});
	});

	it('should initialize the worker without token with minterCanisterId', async () => {
		const { minterCanisterId: _, ...token } = mockValidIcCkToken;
		const { twinToken } = mockValidIcCkToken;

		render(IcCkListener, {
			initFn,
			token,
			twinToken
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith({
			token,
			twinToken
		});
	});

	it('should start the worker on mount and only once', async () => {
		const token = mockValidIcCkToken;
		const { twinToken } = mockValidIcCkToken;

		render(IcCkListener, {
			initFn,
			token,
			twinToken,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});

		await awaitTimer();

		expect(stop).toHaveBeenCalledExactlyOnceWith();
		expect(start).toHaveBeenCalledExactlyOnceWith();

		expect(stop).toHaveBeenCalledBefore(start);

		await awaitTimer();

		expect(stop).toHaveBeenCalledExactlyOnceWith();
		expect(start).toHaveBeenCalledExactlyOnceWith();
	});

	it('should destroy the worker on destroy', async () => {
		const token = mockValidIcCkToken;
		const { twinToken } = mockValidIcCkToken;

		const { unmount } = render(IcCkListener, {
			initFn,
			token,
			twinToken,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith();

		expect(stop).toHaveBeenCalledExactlyOnceWith();
		expect(start).toHaveBeenCalledExactlyOnceWith();

		unmount();

		await awaitTimer();

		expect(destroy).toHaveBeenCalledExactlyOnceWith();

		expect(stop).toHaveBeenCalledExactlyOnceWith();
		expect(start).toHaveBeenCalledExactlyOnceWith();
	});

	it('should trigger the worker on emitted event', async () => {
		const token = mockValidIcCkToken;
		const { twinToken } = mockValidIcCkToken;

		render(IcCkListener, {
			initFn,
			token,
			twinToken,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
		});

		await awaitTimer();

		expect(initFn).toHaveBeenCalledExactlyOnceWith();

		emit({ message: 'oisyTriggerWallet' });

		await awaitTimer();

		expect(trigger).toHaveBeenCalledExactlyOnceWith();
	});
});
