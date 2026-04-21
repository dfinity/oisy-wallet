import { verifyChainId } from '$eth/services/chain-id-verification.services';
import { JsonRpcProvider } from 'ethers/providers';

describe('chain-id-verification.services', () => {
	const mockJsonRpcProvider = vi.mocked(JsonRpcProvider);
	const mockGetNetwork = vi.fn();
	const mockDestroy = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockJsonRpcProvider.prototype.getNetwork = mockGetNetwork;
		mockJsonRpcProvider.prototype.destroy = mockDestroy;
	});

	it('returns ok when chainId matches', async () => {
		mockGetNetwork.mockResolvedValue({ chainId: 10n });

		const result = await verifyChainId({
			rpcUrl: 'https://rpc.example',
			expectedChainId: 10n
		});

		expect(result).toEqual({ status: 'ok' });
		expect(mockJsonRpcProvider).toHaveBeenCalledExactlyOnceWith('https://rpc.example');
		expect(mockDestroy).toHaveBeenCalledOnce();
	});

	it('returns mismatch with the actual chainId when they differ', async () => {
		mockGetNetwork.mockResolvedValue({ chainId: 999n });

		const result = await verifyChainId({
			rpcUrl: 'https://rpc.example',
			expectedChainId: 10n
		});

		expect(result).toEqual({ status: 'mismatch', actualChainId: 999n });
		expect(mockDestroy).toHaveBeenCalledOnce();
	});

	it('returns unreachable when the probe throws', async () => {
		mockGetNetwork.mockRejectedValue(new Error('ECONNREFUSED'));

		const result = await verifyChainId({
			rpcUrl: 'https://rpc.example',
			expectedChainId: 10n
		});

		expect(result).toEqual({ status: 'unreachable', error: 'ECONNREFUSED' });
		expect(mockDestroy).toHaveBeenCalledOnce();
	});

	it('returns unreachable when constructing the provider throws', async () => {
		mockJsonRpcProvider.mockImplementationOnce(() => {
			throw new Error('invalid URL');
		});

		const result = await verifyChainId({
			rpcUrl: 'not-a-url',
			expectedChainId: 10n
		});

		expect(result.status).toBe('unreachable');
		expect(mockDestroy).not.toHaveBeenCalled();
	});
});
