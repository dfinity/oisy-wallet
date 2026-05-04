import type { LedgerCanisterIdText } from '$icp/types/canister';
import { kongTokens } from '$lib/api/kong_backend.api';
import { isKongSupportedIcToken } from '$lib/utils/swap.utils';
import type { Identity } from '@icp-sdk/core/agent';

export const kongSwapSupportedTokens = async ({
	identity
}: {
	identity: Identity;
}): Promise<Set<LedgerCanisterIdText>> => {
	const allTokens = await kongTokens({ identity });

	return allTokens.reduce<Set<LedgerCanisterIdText>>((acc, token) => {
		if (isKongSupportedIcToken(token)) {
			acc.add(token.IC.canister_id);
		}

		return acc;
	}, new Set<LedgerCanisterIdText>());
};
