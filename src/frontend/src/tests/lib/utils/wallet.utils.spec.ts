import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN } from '$env/tokens/tokens.sol.env';
import { INDEX_RELOAD_DELAY } from '$lib/constants/app.constants';
import type { WalletWorker } from '$lib/types/listener';
import type { TokenId } from '$lib/types/token';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import * as timeoutUtils from '$lib/utils/timeout.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { cleanWorkers, loadWorker, waitAndTriggerWallet } from '$lib/utils/wallet.utils';

describe('wallet.utils', () => {
	describe('waitAndTriggerWallet', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(timeoutUtils, 'waitForMilliseconds');
			vi.spyOn(eventsUtils, 'emit');
		});

		it('should wait twice with delay', async () => {
			await waitAndTriggerWallet();

			expect(waitForMilliseconds).toHaveBeenCalledTimes(2);
			expect(waitForMilliseconds).toHaveBeenNthCalledWith(1, INDEX_RELOAD_DELAY);
			expect(waitForMilliseconds).toHaveBeenNthCalledWith(2, INDEX_RELOAD_DELAY);
		});

		it('should emit trigger event twice with delay', async () => {
			await waitAndTriggerWallet();

			expect(emit).toHaveBeenCalledTimes(2);
			expect(emit).toHaveBeenNthCalledWith(1, { message: 'oisyTriggerWallet' });
			expect(emit).toHaveBeenNthCalledWith(2, { message: 'oisyTriggerWallet' });
		});
	});

	describe('cleanWorkers', () => {
		const tokenA = ETHEREUM_TOKEN;
		const tokenB = SOLANA_DEVNET_TOKEN;
		const tokenC = USDC_TOKEN;

		const start = vi.fn();
		const trigger = vi.fn();
		const destroy = vi.fn();

		const mockWorker = {
			start,
			trigger,
			destroy
		};

		const stopA = vi.fn();
		const stopB = vi.fn();

		const destroyA = vi.fn();
		const destroyB = vi.fn();

		let mockWorkers: Map<TokenId, WalletWorker>;

		beforeEach(() => {
			vi.clearAllMocks();

			mockWorkers = new Map<TokenId, WalletWorker>([
				[tokenA.id, { ...mockWorker, stop: stopA, destroy: destroyA }],
				[tokenB.id, { ...mockWorker, stop: stopB, destroy: destroyB }]
			]);
		});

		it('should correctly cleanup workers', () => {
			cleanWorkers({ workers: mockWorkers, tokens: [tokenA] });

			// Check that worker.stop() was called for the removed worker
			expect(stopB).toHaveBeenCalledOnce();
			expect(stopA).not.toHaveBeenCalled();

			// Check that worker.destroy() was called for the removed worker
			expect(destroyB).toHaveBeenCalledOnce();
			expect(destroyA).not.toHaveBeenCalled();

			// Verify the token entry was removed from the workers map
			expect(mockWorkers.has(tokenB.id)).toBeFalsy();
			expect(mockWorkers.has(tokenA.id)).toBeTruthy();
		});

		it('should remove workers not in the tokens list', () => {
			cleanWorkers({ workers: mockWorkers, tokens: [tokenA] });

			expect(stopB).toHaveBeenCalledOnce();
			expect(stopA).not.toHaveBeenCalled();

			expect(mockWorkers.has(tokenB.id)).toBeFalsy();
			expect(mockWorkers.has(tokenA.id)).toBeTruthy();
		});

		it('should not remove any worker if all are still used', () => {
			cleanWorkers({ workers: mockWorkers, tokens: [tokenA, tokenB] });

			expect(stopA).not.toHaveBeenCalled();
			expect(stopB).not.toHaveBeenCalled();

			expect(mockWorkers.has(tokenB.id)).toBeTruthy();
			expect(mockWorkers.has(tokenA.id)).toBeTruthy();
		});

		it('should handle empty tokens list by cleaning all workers', () => {
			cleanWorkers({ workers: mockWorkers, tokens: [] });

			expect(stopA).toHaveBeenCalled();
			expect(stopB).toHaveBeenCalled();

			expect(mockWorkers.size).toBe(0);
		});

		it('should handle empty workers map without errors', () => {
			const workers = new Map<TokenId, WalletWorker>();

			cleanWorkers({ workers, tokens: [tokenA, tokenB] });

			expect(workers.size).toBe(0);
		});

		it('should ignore tokens not in the workers map', () => {
			cleanWorkers({ workers: mockWorkers, tokens: [tokenA, tokenB, tokenC] });

			expect(stopB).not.toHaveBeenCalled();
			expect(stopA).not.toHaveBeenCalled();

			expect(mockWorkers.has(tokenB.id)).toBeTruthy();
			expect(mockWorkers.has(tokenA.id)).toBeTruthy();

			expect(mockWorkers.has(tokenC.id)).toBeFalsy();
		});
	});

	describe('loadWorker', () => {
		const token = ETHEREUM_TOKEN;

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

		let workers: Map<TokenId, WalletWorker>;

		beforeEach(() => {
			vi.clearAllMocks();

			workers = new Map();
		});

		it('should initialise worker if not already present', async () => {
			await loadWorker({ workers, token, initWalletWorker });

			expect(initWalletWorker).toHaveBeenCalledExactlyOnceWith({ token });

			expect(workers.has(token.id)).toBeTruthy();
		});

		it('should start worker if not already present', async () => {
			await loadWorker({ workers, token, initWalletWorker });

			expect(stop).toHaveBeenCalledOnce();
			expect(start).toHaveBeenCalledOnce();
			expect(stop).toHaveBeenCalledBefore(start);
		});

		it('should not initialise worker if already present', async () => {
			workers.set(token.id, mockWorker);

			await loadWorker({ workers, token, initWalletWorker });

			expect(workers.has(token.id)).toBeTruthy();

			expect(initWalletWorker).not.toHaveBeenCalled();

			expect(stop).not.toHaveBeenCalled();
			expect(start).not.toHaveBeenCalled();
		});
	});
});
