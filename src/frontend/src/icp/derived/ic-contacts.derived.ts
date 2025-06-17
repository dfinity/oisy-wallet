import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { isIcrcAddress } from '$icp/utils/icrc-account.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { contacts } from '$lib/derived/contacts.derived';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { NetworkContacts } from '$lib/types/contacts';
import { isIcpAccountIdentifier } from '$lib/utils/account.utils';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import { derived, type Readable } from 'svelte/store';

export const icNetworkContacts: Readable<NetworkContacts> = derived(
	[contacts, tokenWithFallback],
	([$contacts, $tokenWithFallback]) => {
		const isIcpToken = $tokenWithFallback.id === ICP_TOKEN_ID;
		const isIcrcToken = isTokenIcrc({ standard: $tokenWithFallback.standard });

		const allIcNetworkContacts = getNetworkContacts({ addressType: 'Icrcv2', contacts: $contacts });

		return Object.keys(allIcNetworkContacts).reduce<NetworkContacts>((acc, key) => {
			const { address } = allIcNetworkContacts[key];

			return {
				...acc,
				...((isIcpToken && isIcpAccountIdentifier(address)) ||
				(isIcrcToken && isIcrcAddress(address))
					? { [key]: allIcNetworkContacts[key] }
					: {})
			};
		}, {});
	}
);
