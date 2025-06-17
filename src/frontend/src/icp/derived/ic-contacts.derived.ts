import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { parseIcrcv2AccountId } from '$icp/utils/icp-account.utils';
import { isIcrcAddress } from '$icp/utils/icrc-account.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { contacts } from '$lib/derived/contacts.derived';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { NetworkContacts } from '$lib/types/contacts';
import { isIcpAccountIdentifier } from '$lib/utils/account.utils';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import { Principal } from '@dfinity/principal';
import { derived, type Readable } from 'svelte/store';

const isPrincipalAddress = (address: string): boolean | undefined => {
	try {
		const parsed = parseIcrcv2AccountId(address);

		return (
			parsed &&
			'WithPrincipal' in parsed &&
			Array.isArray(parsed.WithPrincipal.subaccount) &&
			parsed.WithPrincipal.subaccount.length === 0 &&
			parsed.WithPrincipal.owner instanceof Principal
		);
	} catch {
		return false;
	}
};

export const icNetworkContacts: Readable<NetworkContacts> = derived(
	[contacts, tokenWithFallback],
	([$contacts, $token]) => {
		const isIcp = $token.id === ICP_TOKEN_ID;
		const isIcrc = isTokenIcrc({ standard: $token.standard });

		const allIcNetworkContacts = getNetworkContacts({
			addressType: 'Icrcv2',
			contacts: $contacts
		});

		const result: NetworkContacts = {};

		for (const [address, contact] of Object.entries(allIcNetworkContacts)) {
			let isValid = false;

			if (isIcpAccountIdentifier(address) && isIcp) {
				isValid = true;
			} else if (isIcrcAddress(address) && isIcrc) {
				isValid = true;
			} else if (isPrincipalAddress(address)) {
				isValid = true;
			}

			if (isValid) {
				result[address] = contact;
			}
		}

		return result;
	}
);
