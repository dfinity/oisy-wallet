import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import * as infuraProviders from '$eth/providers/infura.providers';
import { getNonce } from '$eth/services/nonce.services';
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

		it('should raise an error when the provider fails', async () => {
			const mockError = new Error('Mock error');
			getTransactionCountSpy.mockRejectedValueOnce(mockError);

			await expect(getNonce(mockParams)).rejects.toThrowError(mockError);
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
