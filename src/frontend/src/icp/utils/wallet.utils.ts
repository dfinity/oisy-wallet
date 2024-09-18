import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import type { IcToken } from '$icp/types/ic';
import type { InitWallerWorkerParams, WalletWorker } from '$lib/types/listener';

export const initWalletWorker = async ({ token }: InitWallerWorkerParams): Promise<WalletWorker> =>
	token.standard === 'icrc' ? initIcrcWalletWorker(token as IcToken) : initIcpWalletWorker();
