import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { Dip20WalletWorker } from '$icp/services/worker.dip20-wallet.services';
import { IcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { IcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import { initWalletWorker } from '$icp/utils/wallet.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

describe('wallet.utils', () => {
	describe('initWalletWorker', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(Dip20WalletWorker, 'init');
			vi.spyOn(IcpWalletWorker, 'init');
			vi.spyOn(IcrcWalletWorker, 'init');
		});

		it('should initialize the worker for ICRC tokens', () => {
			const token = {
				...mockValidIcToken,
				standard: { code: 'icrc' as const }
			};

			initWalletWorker({ token });

			expect(IcrcWalletWorker.init).toHaveBeenCalledExactlyOnceWith(token);
		});

		it('should initialize the worker for DIP-20 tokens', () => {
			const token = {
				...mockValidIcToken,
				standard: { code: 'dip20' as const }
			};

			initWalletWorker({ token });

			expect(Dip20WalletWorker.init).toHaveBeenCalledExactlyOnceWith(token);
		});

		it('should initialize the worker for ICP token', () => {
			const token = {
				...mockValidIcToken,
				standard: { code: 'icp' as const }
			};

			initWalletWorker({ token });

			expect(IcpWalletWorker.init).toHaveBeenCalledExactlyOnceWith(token);

			initWalletWorker({ token: ICP_TOKEN });

			expect(IcpWalletWorker.init).toHaveBeenCalledTimes(2);
			expect(IcpWalletWorker.init).toHaveBeenNthCalledWith(2, ICP_TOKEN);
		});

		it('should call initIcpWalletWorker for all other cases', () => {
			const token = {
				...mockValidIcToken,
				standard: { code: 'ethereum' as const }
			};

			initWalletWorker({ token });

			expect(IcpWalletWorker.init).toHaveBeenCalledOnce();
		});
	});
});
