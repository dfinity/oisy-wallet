import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { AppWorker } from '$lib/services/_worker.services';
import { solAddressDevnetStore, solAddressMainnetStore } from '$lib/stores/address.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import {
	syncWallet,
	syncWalletError,
	syncWalletFromCache
} from '$sol/services/sol-listener.services';
import { mapSolSourcesToTokens } from '$sol/services/sol-resolve-signatures.services';
import { SolWalletWorker } from '$sol/services/worker.sol-wallet.services';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2
} from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

vi.mock('$sol/services/sol-listener.services', () => ({
	syncWallet: vi.fn(),
	syncWalletError: vi.fn(),
	syncWalletFromCache: vi.fn()
}));

vi.mock('$sol/services/sol-resolve-signatures.services', () => ({
	mapSolSourcesToTokens: vi.fn()
}));

const postMessageSpy = vi.fn();

let workerInstances: MockWorker[] = [];

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: ((event: MessageEvent) => void) | null = null;
	terminate: () => void = vi.fn();
	addEventListener = vi.fn();
	removeEventListener = vi.fn();
	emit = (data: unknown) => this.onmessage?.({ data } as MessageEvent);
}

vi.mock('$lib/workers/workers?worker', () => ({
	default: class {
		constructor() {
			const worker = new MockWorker();
			workerInstances.push(worker);
			return worker;
		}
	}
}));

const mockId = 'abcdefgh';

vi.stubGlobal('crypto', {
	randomUUID: vi.fn().mockReturnValue(mockId)
});

describe('worker.sol-wallet.services', () => {
	describe('SolWalletWorker', () => {
		const splToken2: SplToken = {
			...mockValidSplToken,
			id: parseTokenId('SplTokenId2'),
			address: mockSolAddress2,
			owner: TOKEN_2022_PROGRAM_ADDRESS
		};

		const splTokens = [mockValidSplToken, splToken2];

		const sourceTokens = new Map<SolAddress, SplTokenAddress | null>([
			[mockSolAddress, null],
			[mockAtaAddress, mockValidSplToken.address],
			[mockAtaAddress2, splToken2.address]
		]);

		const mockWalletData = {
			wallet: { balances: { sol: 1000n, spl: {} }, newTransactions: '[]' }
		};

		const initMainnet = () => SolWalletWorker.init({ token: SOLANA_TOKEN, splTokens });

		beforeEach(() => {
			vi.clearAllMocks();
			AppWorker.resetForTesting();
			workerInstances = [];

			solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
			solAddressDevnetStore.set({ data: mockSolAddress, certified: true });

			vi.mocked(mapSolSourcesToTokens).mockResolvedValue(sourceTokens);
		});

		it('should sync every token of the network from the IDB cache on init', async () => {
			await initMainnet();

			expect(syncWalletFromCache).toHaveBeenCalledTimes(3);

			[SOLANA_TOKEN, ...splTokens].forEach(({ id: tokenId }) =>
				expect(syncWalletFromCache).toHaveBeenCalledWith({
					tokenId,
					networkId: SOLANA_TOKEN.network.id
				})
			);
		});

		// Syncing again would put back a cached balance older than the one already shown.
		it('should not sync again the tokens a previous worker of the network synced', async () => {
			await SolWalletWorker.init({
				token: SOLANA_TOKEN,
				splTokens,
				cachedTokenIds: new Set([SOLANA_TOKEN.id, mockValidSplToken.id])
			});

			expect(syncWalletFromCache).toHaveBeenCalledExactlyOnceWith({
				tokenId: splToken2.id,
				networkId: SOLANA_TOKEN.network.id
			});
		});

		it('should map the sources of the network to its tokens', async () => {
			await initMainnet();

			expect(mapSolSourcesToTokens).toHaveBeenCalledExactlyOnceWith({
				address: mockSolAddress,
				tokens: splTokens.map(({ address, owner }) => ({ address, owner }))
			});
		});

		it('should run each network on a dedicated worker', async () => {
			const spy = vi.spyOn(AppWorker, 'getInstance');

			await initMainnet();
			await SolWalletWorker.init({ token: SOLANA_DEVNET_TOKEN, splTokens: [] });

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenNthCalledWith(1);
			expect(spy).toHaveBeenNthCalledWith(2);
			expect(workerInstances).toHaveLength(2);
		});

		it('should expose the ids of every token of the network', async () => {
			const worker = await initMainnet();

			expect(worker.tokenIds).toEqual([SOLANA_TOKEN.id, mockValidSplToken.id, splToken2.id]);
		});

		// The worker queue holds back further messages until the realm acks, which the mock never does,
		// so each message gets its own test.
		it.each([
			{ action: 'start', msg: 'startSolWalletTimer' },
			{ action: 'trigger', msg: 'triggerSolWalletTimer' },
			{ action: 'stop', msg: 'stopSolWalletTimer' }
		] as const)('should post $msg with the network data on $action', async ({ action, msg }) => {
			const worker = await initMainnet();

			worker[action]();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg,
				workerId: mockId,
				data: {
					address: { data: mockSolAddress, certified: true },
					solanaNetwork: SolanaNetworks.mainnet,
					tokens: splTokens.map(({ address, owner }) => ({ address, owner }))
				}
			});
		});

		describe('onmessage', () => {
			beforeEach(async () => {
				await initMainnet();
			});

			// The scheduler's status messages carry no ref, so they must never reach the wallet stores.
			it('should ignore a message without a ref', () => {
				workerInstances[0].emit({ msg: 'syncSolWallet', data: mockWalletData });

				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should ignore a message for another network', () => {
				workerInstances[0].emit({
					ref: SolanaNetworks.devnet,
					msg: 'syncSolWallet',
					data: mockWalletData
				});

				expect(syncWallet).not.toHaveBeenCalled();
			});

			it('should hand syncSolWallet to syncWallet with the routing of the network', () => {
				workerInstances[0].emit({
					ref: SolanaNetworks.mainnet,
					msg: 'syncSolWallet',
					data: mockWalletData
				});

				expect(syncWallet).toHaveBeenCalledExactlyOnceWith({
					data: mockWalletData,
					routing: {
						nativeTokenId: SOLANA_TOKEN.id,
						splTokenIds: new Map([
							[mockValidSplToken.address, mockValidSplToken.id],
							[splToken2.address, splToken2.id]
						]),
						sourceTokens
					}
				});
			});

			it('should hand syncSolWalletError to syncWalletError for every token of the network', () => {
				const error = new Error('test');

				workerInstances[0].emit({
					ref: SolanaNetworks.mainnet,
					msg: 'syncSolWalletError',
					data: { error }
				});

				expect(syncWalletError).toHaveBeenCalledTimes(3);

				[SOLANA_TOKEN, ...splTokens].forEach(({ id: tokenId }) =>
					expect(syncWalletError).toHaveBeenCalledWith({ tokenId, error, hideToast: true })
				);

				expect(syncWallet).not.toHaveBeenCalled();
			});
		});
	});
});
