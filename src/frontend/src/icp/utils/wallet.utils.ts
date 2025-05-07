import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import type { InitWalletWorkerFn } from '$lib/types/listener';
import { isTokenIcrc } from './icrc.utils';

export const initWalletWorker: InitWalletWorkerFn = ({ token }) =>
	isTokenIcrc(token) ? initIcrcWalletWorker(token) : initIcpWalletWorker();
