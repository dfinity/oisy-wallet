import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import * as infuraProviders from '$eth/providers/infura.providers';
import { getNonce } from '$eth/services/nonce.services';
import { EthNonceReadError } from '$eth/types/send';
import { mockEthAddress } from '$tests/mocks/eth.mock';

describe('nonce.services', () => {
	describe('getNonce', () => {
		const getTransactionCountSpy = vi.fn();

		const mockProvider = {
			getTransactionCount: getTransactionCountSpy
		} as unknown as InfuraProvider;

		const mockCount = 7;

		const mockParams = {
			from: mockEthAddress,
			networkId: BASE_NETWORK_ID
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(infuraProviders, 'infuraProviders').mockReturnValue(mockProvider);

			getTransactionCountSpy.mockResolvedValue(mockCount);
		});

		it('should return the nonce as last transaction count', async () => {
			await expect(getNonce(mockParams)).resolves.toBe(mockCount);

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});
		});

		it('should raise an error saying the nonce could not be read when the provider fails', async () => {
			// Nothing is signed without its nonce, which is what lets the send say it was not sent.
			const mockError = new Error('Mock error');
			getTransactionCountSpy.mockRejectedValueOnce(mockError);

			const outcome = await getNonce(mockParams).catch((err: unknown) => err);

			expect(outcome).toBeInstanceOf(EthNonceReadError);
			expect(outcome).toHaveProperty('cause', mockError);
			expect(outcome).toHaveProperty('message', mockError.message);
		});

		it('should accept an empty string as address', async () => {
			await expect(getNonce({ ...mockParams, from: '' })).resolves.toBe(mockCount);

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: '',
				tag: 'pending'
			});
		});
	});
});
