import {
	balance as dip721Balance,
	getTokensByOwner as dip721GetTokensByOwner
} from '$icp/api/dip721.api';
import {
	balance as extBalance,
	getTokensByOwner as extGetTokensByOwner,
	metadata as extMetadata
} from '$icp/api/ext-v2-token.api';
import {
	ResolveByProbingError,
	resolveByProbing,
	type ResolveGroup
} from '$lib/services/probing.services';
import type { TokenStandardCode } from '$lib/types/token';
import type { Identity } from '@icp-sdk/core/agent';

type AcceptedStandards = Extract<TokenStandardCode, 'ext' | 'dip721'>;

export const detectNftCanisterStandard = async ({
	identity,
	canisterId
}: {
	identity: Identity;
	canisterId: string;
}): Promise<AcceptedStandards | undefined> => {
	// We just want to verify the execution of the methods, not necessarily the results.
	// So, we accept a query call instead of an update.
	const certified = false;

	const baseParams = {
		certified,
		identity,
		canisterId
	};

	// The token identifier is not really important, since we only want to check if the method works for the canister.
	const extCanister: ResolveGroup<AcceptedStandards> = {
		probes: [
			() => extBalance({ ...baseParams, tokenIdentifier: '0' }),
			() => extGetTokensByOwner({ ...baseParams, owner: identity.getPrincipal() }),
			() => extMetadata({ ...baseParams, tokenIdentifier: '0' })
		],
		onResolve: () => 'ext'
	};

	const dip721Canister: ResolveGroup<AcceptedStandards> = {
		probes: [
			() => dip721Balance(baseParams),
			() => dip721GetTokensByOwner({ ...baseParams, owner: identity.getPrincipal() })
		],
		onResolve: () => 'dip721'
	};

	try {
		return await resolveByProbing([extCanister, dip721Canister]);
	} catch (err: unknown) {
		// If the error is caused by the probing service, we cannot identify correctly the standard.
		if (err instanceof ResolveByProbingError) {
			return;
		}

		throw err;
	}
};
