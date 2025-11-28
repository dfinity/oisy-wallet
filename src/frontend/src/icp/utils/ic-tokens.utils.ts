import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';

type IcTokenInput = Omit<Partial<IcToken>, 'ledgerCanisterId'> &
	Required<Pick<IcToken, 'ledgerCanisterId'>>;

export const buildIndexedIcTokens = <T extends IcTokenInput>(
	tokens: T[]
): Record<LedgerCanisterIdText, T> =>
	tokens.reduce<Record<LedgerCanisterIdText, T>>((acc, { ledgerCanisterId, ...rest }) => {
		acc[`${ledgerCanisterId}`] = {
			ledgerCanisterId,
			...rest
		} as T;

		return acc;
	}, {});
