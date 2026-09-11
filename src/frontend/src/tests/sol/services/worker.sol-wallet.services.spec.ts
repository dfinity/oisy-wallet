import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { AppWorker } from '$lib/services/_worker.services';
import { solAddressDevnetStore, solAddressMainnetStore } from '$lib/stores/address.store';
import {
	syncWallet,
	syncWalletError,
	syncWalletFromCache
} from '$sol/services/sol-listener.services';
import { SolWalletWorker } from '$sol/services/worker.sol-wallet.services';
import { SolanaNetworks } from '$sol/types/network';
import { mockSolAddress, mockSplAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

vi.mock('$sol/services/sol-listener.services', () => ({
	syncWallet: vi.fn(),
	syncWalletError: vi.fn(),
	syncWalletFromCache: vi.fn()
}));

// A single realm puts every token on the same pooled worker, so the `ref` filter is the only thing
// keeping one token's messages out of another token's stores.
vi.mock('$lib/utils/device.utils', async (importActual) => ({
	...(await importActual()),
	workerPoolSize: () => 1
}));

const postMessageSpy = vi.fn();

type Listener = (event: MessageEvent) => void;

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: Listener | null = null;
	terminate: () => void = vi.fn();
	// Pooled wrappers each register their own listener on the shared worker, so keep all of them.
	listeners = new Set<Listener>();
	addEventListener = vi.fn((...args: [string, Listener]) => {
		const [, listener] = args;
		this.listeners.add(listener);
	});
	removeEventListener = vi.fn((...args: [string, Listener]) => {
		const [, listener] = args;
		this.listeners.delete(listener);
	});
	emit = (data: unknown) => {
		this.listeners.forEach((listener) => listener({ data } as MessageEvent));
	};
}

let workerInstance: MockWorker;

vi.mock('$lib/workers/workers?worker', () => {
	class MockWorkers {
		constructor() {
			workerInstance = new MockWorker();
			return workerInstance;
		}
	}

	return {
		default: MockWorkers
	};
});

const mockId = 'abcdefgh';

vi.stubGlobal('crypto', {
	randomUUID: vi.fn().mockReturnValue(mockId)
});

describe('worker.sol-wallet.services', () => {
	describe('SolWalletWorker', () => {
		const solMainnetRef = 'SOL-mainnet';
		const splMainnetRef = `${mockSplAddress}-mainnet`;

		const mockWalletData = { wallet: { balance: { data: 1000n, certified: false } } };

		beforeEach(() => {
			vi.clearAllMocks();
			AppWorker.resetForTesting();

			solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
			solAddressDevnetStore.set({ data: mockSolAddress, certified: true });
		});

		it('should sync the token from the IDB cache on init', async () => {
			await SolWalletWorker.init({ token: SOLANA_TOKEN });

			expect(syncWalletFromCache).toHaveBeenCalledExactlyOnceWith({
				tokenId: SOLANA_TOKEN.id,
				networkId: SOLANA_TOKEN.network.id
			});
		});

		it.each([
			{ name: 'native SOL on mainnet', token: SOLANA_TOKEN, poolKey: solMainnetRef },
			{ name: 'native SOL on devnet', token: SOLANA_DEVNET_TOKEN, poolKey: 'SOL-devnet' },
			{ name: 'an SPL token', token: mockValidSplToken, poolKey: splMainnetRef }
		])(
			'should get a pooled worker keyed by token and network for $name',
			async ({ token, poolKey }) => {
				const spy = vi.spyOn(AppWorker, 'getInstance');

				await SolWalletWorker.init({ token });

				expect(spy).toHaveBeenCalledExactlyOnceWith({ pooled: true, poolKey });
			}
		);

		// The worker queue holds back further messages until the realm acks, which the mock never does,
		// so each message gets its own test.
		it.each([
			{ action: 'start', msg: 'startSolWalletTimer' },
			{ action: 'trigger', msg: 'triggerSolWalletTimer' },
			{ action: 'stop', msg: 'stopSolWalletTimer' }
		] as const)('should post $msg with the token data on $action', async ({ action, msg }) => {
			const worker = await SolWalletWorker.init({ token: mockValidSplToken });

			worker[action]();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg,
				workerId: mockId,
				data: {
					address: { data: mockSolAddress, certified: true },
					solanaNetwork: SolanaNetworks.mainnet,
					tokenAddress: mockValidSplToken.address,
					tokenOwnerAddress: mockValidSplToken.owner
				}
			});
		});

		describe('onmessage', () => {
			beforeEach(async () => {
				await SolWalletWorker.init({ token: SOLANA_TOKEN });
			});

			// The scheduler's status messages carry no ref, so they must never reach the wallet stores.
			it('should ignore a message without a ref', () => {
				workerInstance.emit({ msg: 'syncSolWallet', data: mockWalletData });

				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should ignore a message whose ref belongs to another token', () => {
				workerInstance.emit({ ref: splMainnetRef, msg: 'syncSolWallet', data: mockWalletData });

				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should ignore a message for the same token on another network', () => {
				workerInstance.emit({ ref: 'SOL-devnet', msg: 'syncSolWallet', data: mockWalletData });

				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should hand syncSolWallet to syncWallet', () => {
				workerInstance.emit({ ref: solMainnetRef, msg: 'syncSolWallet', data: mockWalletData });

				expect(syncWallet).toHaveBeenCalledExactlyOnceWith({
					tokenId: SOLANA_TOKEN.id,
					data: mockWalletData
				});
			});

			it('should hand syncSolWalletError to syncWalletError with the toast hidden', () => {
				const error = new Error('test');

				workerInstance.emit({ ref: solMainnetRef, msg: 'syncSolWalletError', data: { error } });

				expect(syncWalletError).toHaveBeenCalledExactlyOnceWith({
					tokenId: SOLANA_TOKEN.id,
					error,
					hideToast: true
				});
				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should route each message only to its own token when tokens share a pooled worker', async () => {
				await SolWalletWorker.init({ token: mockValidSplToken });

				expect(workerInstance.listeners.size).toBe(2);

				workerInstance.emit({ ref: splMainnetRef, msg: 'syncSolWallet', data: mockWalletData });

				expect(syncWallet).toHaveBeenCalledExactlyOnceWith({
					tokenId: mockValidSplToken.id,
					data: mockWalletData
				});
			});
		});
	});
});
