import { Dip20WalletWorker } from '$icp/services/worker.dip20-wallet.services';
import { IcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
import { IcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
import type { IcToken } from '$icp/types/ic-token';
import { isTokenDip20, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { InitWalletWorkerFn } from '$lib/types/listener';

export const initWalletWorker: InitWalletWorkerFn<IcToken> = ({ token }) =>
	isTokenIcrc(token)
		? IcrcWalletWorker.init(token)
		: isTokenDip20(token)
			? Dip20WalletWorker.init(token)
			: IcpWalletWorker.init(token);
