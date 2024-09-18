import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import type { IcToken } from '$icp/types/ic';
import type { WalletWorker } from '$lib/types/listener';
import type { Token } from '$lib/types/token';

export const initWalletWorker = async ({ token }: { token: Token }): Promise<WalletWorker> =>
	token.standard === 'icrc' ? initIcrcWalletWorker(token as IcToken) : initIcpWalletWorker();
