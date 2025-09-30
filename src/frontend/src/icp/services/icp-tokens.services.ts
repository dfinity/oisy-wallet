import { SUPPORTED_ICP_TOKENS } from '$env/tokens/tokens.icp.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenExtended } from '$icp/types/icrc-custom-token';

export const buildIndexedIcpTokens = (): Record<LedgerCanisterIdText, IcTokenExtended> =>
	SUPPORTED_ICP_TOKENS.reduce(
		(acc, { ledgerCanisterId, ...rest }) => ({
			...acc,
			[`${ledgerCanisterId}`]: {
				ledgerCanisterId,
				...rest
			}
		}),
		{}
	);
