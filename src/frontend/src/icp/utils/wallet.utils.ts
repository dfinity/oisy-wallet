import { initDip20WalletWorker } from '$icp/services/worker.dip20-wallet.services';
import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import { isTokenDip20, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { InitWalletWorkerFn } from '$lib/types/listener';

export const initWalletWorker: InitWalletWorkerFn = ({ token }) =>
	isTokenIcrc(token)
		? initIcrcWalletWorker(token)
		: isTokenDip20(token)
			? initDip20WalletWorker(token)
			: initIcpWalletWorker();
