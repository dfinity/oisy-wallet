import type { IcToken } from '$icp/types/ic-token';
import { isTokenIcpTestnet } from '$icp/utils/icp-ledger.utils';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';

export const isTokenIcTestnet = (token: Partial<IcToken>): boolean =>
	isTokenIcpTestnet(token) || isTokenIcrcTestnet(token);
