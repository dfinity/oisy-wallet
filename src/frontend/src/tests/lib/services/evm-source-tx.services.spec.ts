import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import {
	readEvmSourceTxOutcome,
	resetEvmSourceTxObservations
} from '$lib/services/evm-source-tx.services';
import { mockEthAddress } from '$tests/mocks/eth.mock';

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn()
}));

describe('evm-source-tx.services', () => {
	let getTransactionReceipt: ReturnType<typeof vi.fn>;
	let getTransactionCountLatest: ReturnType<typeof vi.fn>;

	const read = ({
		rowId = 'row-1',
		network = ETHEREUM_NETWORK,
		confirmedNonceByChainId = new Map<string, Promise<number>>()
	}: {
		rowId?: string;
		network?: typeof ETHEREUM_NETWORK;
		confirmedNonceByChainId?: Map<string, Promise<number>>;
	} = {}) =>
		readEvmSourceTxOutcome({
			rowId,
			hash: '0xhash',
			txNonce: 5,
			network,
			userAddress: mockEthAddress,
			confirmedNonceByChainId
		});

	beforeEach(() => {
		vi.clearAllMocks();
		resetEvmSourceTxObservations();

		getTransactionReceipt = vi.fn();
		getTransactionCountLatest = vi.fn();
		vi.mocked(infuraProviders).mockReturnValue({
			getTransactionReceipt,
			getTransactionCountLatest
		} as unknown as ReturnType<typeof infuraProviders>);
	});

	describe('readEvmSourceTxOutcome', () => {
		it('should read the receipt on the given network', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 1 });

			await expect(read({ network: BASE_NETWORK })).resolves.toBe('succeeded');

			expect(infuraProviders).toHaveBeenCalledWith(BASE_NETWORK.id);
			expect(getTransactionCountLatest).not.toHaveBeenCalled();
		});

		it('should read a mined, reverted transaction as reverted', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 0 });

			await expect(read()).resolves.toBe('reverted');
		});

		it('should read a missing receipt with an unconsumed nonce as pending', async () => {
			getTransactionReceipt.mockResolvedValue(null);
			getTransactionCountLatest.mockResolvedValue(5);

			await expect(read()).resolves.toBe('pending');
		});

		describe('replacement rule', () => {
			beforeEach(() => {
				getTransactionReceipt.mockResolvedValue(null);
				getTransactionCountLatest.mockResolvedValue(6);
			});

			it('should report replaced only on the second consecutive observation of a row', async () => {
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('replaced');
			});

			it('should count each row on its own', async () => {
				await expect(read({ rowId: 'row-1' })).resolves.toBe('pending');
				await expect(read({ rowId: 'row-2' })).resolves.toBe('pending');
			});

			it('should restart the count once the row stops looking replaced', async () => {
				await expect(read()).resolves.toBe('pending');

				getTransactionCountLatest.mockResolvedValueOnce(5);

				await expect(read()).resolves.toBe('pending');

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('replaced');
			});

			it('should trust a receipt that lands between the nonce read and its re-read', async () => {
				getTransactionReceipt.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 1 });

				await expect(read()).resolves.toBe('succeeded');
			});
		});

		it('should read the confirmed nonce once per chain within one poll', async () => {
			getTransactionReceipt.mockResolvedValue(null);
			getTransactionCountLatest.mockResolvedValue(5);

			const confirmedNonceByChainId = new Map<string, Promise<number>>();

			await read({ rowId: 'row-1', confirmedNonceByChainId });
			await read({ rowId: 'row-2', confirmedNonceByChainId });
			await read({ rowId: 'row-3', network: BASE_NETWORK, confirmedNonceByChainId });

			expect(getTransactionCountLatest).toHaveBeenCalledTimes(2);
		});
	});
});
