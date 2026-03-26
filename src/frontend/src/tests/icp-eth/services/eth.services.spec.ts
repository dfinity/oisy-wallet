import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import {
	loadCkEthereumPendingTransactions,
	loadPendingCkEthereumTransaction
} from '$icp-eth/services/eth.services';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import * as analyticsServices from '$lib/services/analytics.services';
import * as toastsStore from '$lib/stores/toasts.store';
import * as eventsUtils from '$lib/utils/events.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

const { mockGetLogs, mockGetTransaction } = vi.hoisted(() => ({
	mockGetLogs: vi.fn(),
	mockGetTransaction: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$eth/utils/eth.utils', () => ({
	isSupportedEthTokenId: vi.fn()
}));

vi.mock('$eth/utils/token.utils', () => ({
	tokenAddressToHex: vi.fn((addr) => `0x${addr}`)
}));

vi.mock('@icp-sdk/canisters/cketh', () => ({
	encodePrincipalToEthAddress: vi.fn(() => '0xPrincipalEthAddress')
}));

vi.mock('$eth/providers/infura-cketh.providers', () => ({
	infuraCkETHProviders: vi.fn(() => ({
		getLogs: mockGetLogs
	}))
}));

vi.mock('$eth/providers/alchemy.providers', () => ({
	alchemyProviders: vi.fn(() => ({
		getTransaction: mockGetTransaction
	}))
}));

describe('eth.services', () => {
	const mockToken: IcToken = {
		...mockValidIcrcToken,
		id: parseTokenId('ckETH')
	};

	const mockToAddress = '0xRecipientAddress';
	const mockLastObservedBlockNumber = 100n;

	beforeEach(() => {
		vi.clearAllMocks();
		icPendingTransactionsStore.reinitialize();

		vi.mocked(isSupportedEthTokenId).mockReturnValue(true);
		mockGetLogs.mockResolvedValue([]);
	});

	describe('loadCkEthereumPendingTransactions', () => {
		it('should return early when identity is null', async () => {
			const emitSpy = vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: null,
				twinToken: ETHEREUM_TOKEN
			});

			expect(emitSpy).not.toHaveBeenCalled();
		});

		it('should dispatch to ckETH pending transactions for ETH tokens', async () => {
			vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: ETHEREUM_TOKEN
			});

			expect(mockGetLogs).toHaveBeenCalled();
		});

		it('should dispatch to ckErc20 pending transactions for non-ETH tokens', async () => {
			vi.mocked(isSupportedEthTokenId).mockReturnValue(false);

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: mockValidErc20Token
			});

			expect(mockGetLogs).toHaveBeenCalled();
		});

		it('should reset store when no pending logs found', async () => {
			const resetSpy = vi.spyOn(icPendingTransactionsStore, 'reset');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: ETHEREUM_TOKEN
			});

			expect(resetSpy).toHaveBeenCalledWith(mockToken.id);
		});

		it('should set pending transactions when logs found', async () => {
			const mockLogs = [{ transactionHash: '0xhash1' }, { transactionHash: '0xhash2' }];
			mockGetLogs.mockResolvedValue(mockLogs);

			mockGetTransaction.mockResolvedValue({
				hash: '0xhash1',
				from: '0xFrom',
				to: '0xTo',
				value: 1_000_000n
			});

			const setSpy = vi.spyOn(icPendingTransactionsStore, 'set');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: ETHEREUM_TOKEN
			});

			expect(setSpy).toHaveBeenCalled();
		});

		it('should emit events for progress tracking', async () => {
			const emitSpy = vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: ETHEREUM_TOKEN
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
			mockGetLogs.mockRejectedValue(new Error('Provider error'));

			const emitSpy = vi.spyOn(eventsUtils, 'emit');

			await loadCkEthereumPendingTransactions({
				toAddress: mockToAddress,
				token: mockToken,
				lastObservedBlockNumber: mockLastObservedBlockNumber,
				identity: mockIdentity,
				twinToken: ETHEREUM_TOKEN
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
		it('should prepend pending transaction to store on success', async () => {
			mockGetTransaction.mockResolvedValue({
				hash: '0xhashPending',
				from: '0xFrom',
				to: '0xTo',
				value: 500_000n
			});

			const prependSpy = vi.spyOn(icPendingTransactionsStore, 'prepend');

			await loadPendingCkEthereumTransaction({
				hash: '0xhashPending',
				token: mockToken,
				twinToken: ETHEREUM_TOKEN,
				networkId: ETHEREUM_NETWORK.id
			});

			expect(prependSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					tokenId: mockToken.id
				})
			);
		});

		it('should show error toast when transaction is null', async () => {
			mockGetTransaction.mockResolvedValue(null);

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await loadPendingCkEthereumTransaction({
				hash: '0xNotFoundHash',
				token: mockToken,
				twinToken: ETHEREUM_TOKEN,
				networkId: ETHEREUM_NETWORK.id
			});

			expect(toastsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: expect.stringContaining('0xNotFoundHash') }
				})
			);
		});

		it('should show error toast on exception', async () => {
			mockGetTransaction.mockRejectedValue(new Error('Network failure'));

			const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

			await loadPendingCkEthereumTransaction({
				hash: '0xErrorHash',
				token: mockToken,
				twinToken: ETHEREUM_TOKEN,
				networkId: ETHEREUM_NETWORK.id
			});

			expect(toastsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: expect.stringContaining('0xErrorHash') }
				})
			);
		});

		it('should use mapCkErc20PendingTransaction for non-ETH twin tokens', async () => {
			vi.mocked(isSupportedEthTokenId).mockReturnValue(false);

			mockGetTransaction.mockResolvedValue({
				hash: '0xhashErc20',
				from: '0xFrom',
				to: '0xTo',
				value: 500_000n
			});

			const prependSpy = vi.spyOn(icPendingTransactionsStore, 'prepend');

			await loadPendingCkEthereumTransaction({
				hash: '0xhashErc20',
				token: mockToken,
				twinToken: mockValidErc20Token,
				networkId: ETHEREUM_NETWORK.id
			});

			expect(prependSpy).toHaveBeenCalled();
		});
	});
});
