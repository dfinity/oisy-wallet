import {
	VERIFY_CHAIN_ID_TIMEOUT_MS,
	verifyChainId
} from '$eth/services/chain-id-verification.services';
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

	it('returns unreachable and destroys the provider when the probe exceeds the timeout', async () => {
		vi.useFakeTimers();
		// A promise that never resolves — simulates a silently-hung RPC.
		mockGetNetwork.mockImplementation(() => new Promise(() => {}));

		try {
			const pending = verifyChainId({
				rpcUrl: 'https://slow.example',
				expectedChainId: 10n
			});

			await vi.advanceTimersByTimeAsync(VERIFY_CHAIN_ID_TIMEOUT_MS);

			const result = await pending;

			expect(result.status).toBe('unreachable');
			expect(result).toEqual({
				status: 'unreachable',
				error: `RPC probe timed out after ${VERIFY_CHAIN_ID_TIMEOUT_MS}ms`
			});
			expect(mockDestroy).toHaveBeenCalledOnce();
		} finally {
			vi.useRealTimers();
		}
	});
});
