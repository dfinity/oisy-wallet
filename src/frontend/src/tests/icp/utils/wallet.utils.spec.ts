import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { initDip20WalletWorker } from '$icp/services/worker.dip20-wallet.services';
import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import { initWalletWorker } from '$icp/utils/wallet.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

vi.mock('$icp/services/worker.dip20-wallet.services', () => ({
	initDip20WalletWorker: vi.fn()
}));

vi.mock('$icp/services/worker.icp-wallet.services', () => ({
	initIcpWalletWorker: vi.fn()
}));

vi.mock('$icp/services/worker.icrc-wallet.services', () => ({
	initIcrcWalletWorker: vi.fn()
}));

describe('wallet.utils', () => {
	describe('initWalletWorker', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialize the worker for ICRC tokens', () => {
			const token = {
				...mockValidIcToken,
				standard: 'icrc' as const
			};

			initWalletWorker({ token });

			expect(initIcrcWalletWorker).toHaveBeenCalledExactlyOnceWith(token);
		});

		it('should initialize the worker for DIP-20 tokens', () => {
			const token = {
				...mockValidIcToken,
				standard: 'dip20' as const
			};

			initWalletWorker({ token });

			expect(initDip20WalletWorker).toHaveBeenCalledExactlyOnceWith(token);
		});

		it('should initialize the worker for ICP token', () => {
			const token = {
				...mockValidIcToken,
				standard: 'icp' as const
			};

			initWalletWorker({ token });

			expect(initIcpWalletWorker).toHaveBeenCalledExactlyOnceWith(token);

			initWalletWorker({ token: ICP_TOKEN });

			expect(initIcpWalletWorker).toHaveBeenCalledTimes(2);
			expect(initIcpWalletWorker).toHaveBeenNthCalledWith(2, ICP_TOKEN);
		});

		it('should call initIcpWalletWorker for all other cases', () => {
			const token = {
				...mockValidIcToken,
				standard: 'ethereum' as const
			};

			initWalletWorker({ token });

			expect(initIcpWalletWorker).toHaveBeenCalledOnce();
		});
	});
});
