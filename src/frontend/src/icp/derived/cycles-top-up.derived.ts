import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import { getCanisterNetworkContacts, parseCanisterId } from '$icp/utils/cycles-top-up.utils';
import { contacts } from '$lib/derived/contacts.derived';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The canister IDs in the user's contacts, by the CMC deposit account identifier an ICP
 * top-up to each pays into, in lower case. ICP history names a top-up's destination only by
 * that account, so these are the canisters an ICP top-up in Activity can be named after.
 */
export const cmcDepositAccountCanisterIds: Readable<Record<string, string>> = derived(
	[contacts],
	([$contacts]) =>
		Object.values(getCanisterNetworkContacts($contacts)).reduce<Record<string, string>>(
			(acc, { address }) => {
				const canisterId = parseCanisterId(address);

				return isNullish(canisterId)
					? acc
					: { ...acc, [getCmcDepositAccountIdentifier(canisterId).toLowerCase()]: address };
			},
			{}
		)
);
