import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN } from '$env/tokens/tokens.sol.env';
import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
import type { WalletWorker } from '$lib/types/listener';
import type { TokenId } from '$lib/types/token';
import { emit } from '$lib/utils/events.utils';
import * as walletUtils from '$lib/utils/wallet.utils';
import { cleanWorkers, loadWorker } from '$lib/utils/wallet.utils';
import { render } from '@testing-library/svelte';
import { SvelteMap } from 'svelte/reactivity';

describe('WalletWorkers', () => {
	const tokenA = ETHEREUM_TOKEN;
	const tokenB = SOLANA_DEVNET_TOKEN;
	const tokenC = USDC_TOKEN;
	const tokens = [tokenA, tokenB, tokenC];

	const stop = vi.fn();
	const start = vi.fn();
	const trigger = vi.fn();
	const destroy = vi.fn();

	const mockWorker: WalletWorker = {
		stop,
		start,
		trigger,
		destroy
	};

	const initWalletWorker = vi.fn(async () => await Promise.resolve(mockWorker));

	const waitTimer = () => vi.advanceTimersByTimeAsync(500 * 10);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		vi.spyOn(walletUtils, 'cleanWorkers');
		vi.spyOn(walletUtils, 'loadWorker');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should handle empty tokens list', async () => {
		render(WalletWorkers, { tokens: [], initWalletWorker });

		await waitTimer();

		expect(initWalletWorker).not.toHaveBeenCalled();

		const workers: SvelteMap<TokenId, WalletWorker> = new SvelteMap<TokenId, WalletWorker>();

		expect(cleanWorkers).toHaveBeenCalledExactlyOnceWith({ workers, tokens: [] });
		expect(loadWorker).not.toHaveBeenCalled();
	});

	it('should initialize the workers for all the tokens', async () => {
		render(WalletWorkers, { tokens, initWalletWorker });

		await waitTimer();

		expect(initWalletWorker).toHaveBeenCalledTimes(tokens.length);

		tokens.forEach((token, index) => {
			expect(initWalletWorker).toHaveBeenNthCalledWith(index + 1, { token });
		});

		const workers: SvelteMap<TokenId, WalletWorker> = new SvelteMap<TokenId, WalletWorker>([
			[tokenA.id, mockWorker],
			[tokenB.id, mockWorker],
			[tokenC.id, mockWorker]
		]);

		expect(cleanWorkers).toHaveBeenCalledExactlyOnceWith({ workers, tokens });

		tokens.forEach((token, index) => {
			expect(loadWorker).toHaveBeenNthCalledWith(index + 1, {
				workers,
				token,
				initWalletWorker
			});
		});
	});

	it('should trigger the workers on event', async () => {
		render(WalletWorkers, { tokens, initWalletWorker });

		await waitTimer();

		expect(initWalletWorker).toHaveBeenCalledTimes(tokens.length);
		expect(trigger).not.toHaveBeenCalled();

		emit({ message: 'oisyTriggerWallet' });

		await waitTimer();

		expect(trigger).toHaveBeenCalledTimes(tokens.length);
	});

	it('should destroy workers on unmount', async () => {
		const { unmount } = render(WalletWorkers, { tokens, initWalletWorker });

		await waitTimer();

		expect(initWalletWorker).toHaveBeenCalledTimes(tokens.length);

		unmount();

		await waitTimer();

		expect(destroy).toHaveBeenCalledTimes(tokens.length);
	});

	it('should handle tokens change', async () => {
		const mockTokens = [tokenA, tokenB];

		const { rerender } = render(WalletWorkers, { tokens: mockTokens, initWalletWorker });

		await waitTimer();

		expect(loadWorker).toHaveBeenCalledTimes(mockTokens.length);
		expect(initWalletWorker).toHaveBeenCalledTimes(mockTokens.length);

		await rerender({ tokens: [...mockTokens, tokenC], initWalletWorker });

		await waitTimer();

		expect(loadWorker).toHaveBeenCalledTimes(mockTokens.length * 2 + 1);
		expect(initWalletWorker).toHaveBeenCalledTimes(mockTokens.length + 1);
	});
});
