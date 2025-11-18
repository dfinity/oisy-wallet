import { icrc10SupportedStandards } from '$icp/api/icrc-nft-ledger.api';
import { IcTokenStandards } from '$icp/types/ic-token';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';

export const isIcrcTokenSupportIcrc7 = async ({
	identity,
	ledgerCanisterId
}: {
	identity: OptionIdentity;
	ledgerCanisterId: CanisterIdText;
}) => {
	try {
		const supportedStandards = await icrc10SupportedStandards({
			identity,
			ledgerCanisterId
		});

		return supportedStandards.some(({ name }) => name === IcTokenStandards.icrc7);
	} catch (_: unknown) {
		// If the ledger canister does not support the method, we can be sure that is not an ICRC-7 token.
		// That is because the specifications say that an ICRC-7 must implement ICRC-10.
		// Ref: https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md#icrc10_supported_standards
		return false;
	}
};
