import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import type { IcToken } from '$icp/types/ic-token';
import type { InitWalletWorkerFn } from '$lib/types/listener';

export const initWalletWorker: InitWalletWorkerFn = ({ token }) =>
	token.standard === 'icrc' ? initIcrcWalletWorker(token as IcToken) : initIcpWalletWorker();
