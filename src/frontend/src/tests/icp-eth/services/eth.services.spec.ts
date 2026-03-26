import * as alchemyProviders from '$eth/providers/alchemy.providers';
import * as infuraCkETHProviders from '$eth/providers/infura-cketh.providers';
import {
	loadCkEthereumPendingTransactions,
	loadPendingCkEthereumTransaction
} from '$icp-eth/services/eth.services';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import * as analyticsServices from '$lib/services/analytics.services';
import * as toastsStore from '$lib/stores/toasts.store';
import * as eventsUtils from '$lib/utils/events.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$eth/utils/eth.utils', () => ({
	isSupportedEthTokenId: vi.fn((id) => id === Symbol.for('ETH'))
}));

vi.mock('$eth/utils/token.utils', () => ({
	tokenAddressToHex: vi.fn((addr) => `0x${addr}`)
}));

vi.mock('@icp-sdk/canisters/cketh', () => ({
	encodePrincipalToEthAddress: vi.fn(() => '0xPrincipalEthAddress')
}));

describe('icp-eth/services/eth.services', () => {
	const mockTwinTokenNetworkId = Symbol('Ethereum');
	const mockTwinToken = {
		...mockValidToken,
		id: Symbol.for('ETH'),
		network: {
			id: mockTwinTokenNetworkId,
			name: 'Ethereum',
			env: 'mainnet' as const,
			explorerUrl: 'https://etherscan.io'
		},
		symbol: 'ETH'
	};

	const mockToken: IcToken = {
		...mockValidToken,
		id: Symbol('ckETH') as never,
		ledgerCanisterId: 'mock-ledger',
		fee: 10_000n,
		standard: { code: 'icrc' }
	} as unknown as IcToken;

	const mockToAddress = '0xRecipientAddress';
	const mockLastObservedBlockNumber = 100n;

	beforeEach(() => {
		vi.clearAllMocks();
		icPendingTransactionsStore.reinitialize();
	});

	describe('loadCkEthereumPendingTransactions', () => {
		it('should return early when identity is null', async () => {
			const emitSpy = vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: null,
				twinToken: mockTwinToken as never
			});

			expect(emitSpy).not.toHaveBeenCalled();
		});

		it('should dispatch to ckETH pending transactions for ETH tokens', async () => {
			const mockGetLogs = vi.fn().mockResolvedValue([]);
			vi.spyOn(infuraCkETHProviders, 'infuraCkETHProviders').mockReturnValue({
				getLogs: mockGetLogs
			} as never);

			vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: mockTwinToken as never
			});

			expect(mockGetLogs).toHaveBeenCalled();
		});

		it('should dispatch to ckErc20 pending transactions for non-ETH tokens', async () => {
			const mockGetLogs = vi.fn().mockResolvedValue([]);
			vi.spyOn(infuraCkETHProviders, 'infuraCkETHProviders').mockReturnValue({
				getLogs: mockGetLogs
			} as never);

			const erc20TwinToken = {
				...mockTwinToken,
				id: Symbol('ERC20'),
				address: '0xErc20Address'
			};

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: erc20TwinToken as never
			});

			expect(mockGetLogs).toHaveBeenCalled();
		});

		it('should reset store when no pending logs found', async () => {
			const mockGetLogs = vi.fn().mockResolvedValue([]);
			vi.spyOn(infuraCkETHProviders, 'infuraCkETHProviders').mockReturnValue({
				getLogs: mockGetLogs
			} as never);

			const resetSpy = vi.spyOn(icPendingTransactionsStore, 'reset');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: mockTwinToken as never
			});

			expect(resetSpy).toHaveBeenCalledWith(mockToken.id);
		});

		it('should set pending transactions when logs found', async () => {
			const mockLogs = [{ transactionHash: '0xhash1' }, { transactionHash: '0xhash2' }];

			vi.spyOn(infuraCkETHProviders, 'infuraCkETHProviders').mockReturnValue({
				getLogs: vi.fn().mockResolvedValue(mockLogs)
			} as never);

			vi.spyOn(alchemyProviders, 'alchemyProviders').mockReturnValue({
				getTransaction: vi.fn().mockResolvedValue({
					hash: '0xhash1',
					from: '0xFrom',
					to: '0xTo',
					value: 1_000_000n
				})
			} as never);

			const setSpy = vi.spyOn(icPendingTransactionsStore, 'set');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: mockTwinToken as never
			});

			expect(setSpy).toHaveBeenCalled();
		});

		it('should emit events for progress tracking', async () => {
			vi.spyOn(infuraCkETHProviders, 'infuraCkETHProviders').mockReturnValue({
				getLogs: vi.fn().mockResolvedValue([])
			} as never);

			const emitSpy = vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: mockTwinToken as never
			});

			expect(emitSpy).toHaveBeenCalledWith({
				message: 'oisyCkEthereumPendingTransactions',
				detail: 'in_progress'
			});
			expect(emitSpy).toHaveBeenCalledWith({
				message: 'oisyCkEthereumPendingTransactions',
				detail: 'idle'
			});
		});

		it('should track error event on failure', async () => {
			vi.spyOn(infuraCkETHProviders, 'infuraCkETHProviders').mockReturnValue({
				getLogs: vi.fn().mockRejectedValue(new Error('Provider error'))
			} as never);

			const emitSpy = vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: mockTwinToken as never
			});

			expect(analyticsServices.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: expect.any(String)
				})
			);
			expect(emitSpy).toHaveBeenCalledWith({
				message: 'oisyCkEthereumPendingTransactions',
				detail: 'idle'
			});
		});
	});

	describe('loadPendingCkEthereumTransaction', () => {
		const mockNetworkId = Symbol('ETH');

		it('should prepend pending transaction to store on success', async () => {
			vi.spyOn(alchemyProviders, 'alchemyProviders').mockReturnValue({
				getTransaction: vi.fn().mockResolvedValue({
					hash: '0xhashPending',
					from: '0xFrom',
					to: '0xTo',
					value: 500_000n
				})
			} as never);

			const prependSpy = vi.spyOn(icPendingTransactionsStore, 'prepend');

			await loadPendingCkEthereumTransaction({
				hash: '0xhashPending',
				token: mockToken,
				twinToken: mockTwinToken as never,
				networkId: mockNetworkId as never
			});

			expect(prependSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					tokenId: mockToken.id
				})
			);
		});

		it('should show error toast when transaction is null', async () => {
			vi.spyOn(alchemyProviders, 'alchemyProviders').mockReturnValue({
				getTransaction: vi.fn().mockResolvedValue(null)
			} as never);

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await loadPendingCkEthereumTransaction({
				hash: '0xNotFoundHash',
				token: mockToken,
				twinToken: mockTwinToken as never,
				networkId: mockNetworkId as never
			});

			expect(toastsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: expect.stringContaining('0xNotFoundHash') }
				})
			);
		});

		it('should show error toast on exception', async () => {
			vi.spyOn(alchemyProviders, 'alchemyProviders').mockReturnValue({
				getTransaction: vi.fn().mockRejectedValue(new Error('Network failure'))
			} as never);

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await loadPendingCkEthereumTransaction({
				hash: '0xErrorHash',
				token: mockToken,
				twinToken: mockTwinToken as never,
				networkId: mockNetworkId as never
			});

			expect(toastsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: expect.stringContaining('0xErrorHash') }
				})
			);
		});

		it('should use mapCkErc20PendingTransaction for non-ETH twin tokens', async () => {
			const erc20TwinToken = {
				...mockTwinToken,
				id: Symbol('ERC20'),
				address: '0xErc20'
			};

			vi.spyOn(alchemyProviders, 'alchemyProviders').mockReturnValue({
				getTransaction: vi.fn().mockResolvedValue({
					hash: '0xhashErc20',
					from: '0xFrom',
					to: '0xTo',
					value: 500_000n
				})
			} as never);

			const prependSpy = vi.spyOn(icPendingTransactionsStore, 'prepend');

			await loadPendingCkEthereumTransaction({
				hash: '0xhashErc20',
				token: mockToken,
				twinToken: erc20TwinToken as never,
				networkId: mockNetworkId as never
			});

			expect(prependSpy).toHaveBeenCalled();
		});
	});
});
