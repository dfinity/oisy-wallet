import { tryToParseIcrcAccountStringToAccountIdentifierText } from '$icp/utils/icp-account.utils';
import { isIcrcAddress } from '$icp/utils/icrc-account.utils';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import { contacts } from '$lib/derived/contacts.derived';
import { tokenWithFallback } from '$lib/derived/token.derived';
import type { NetworkContacts } from '$lib/types/contacts';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const icNetworkContacts: Readable<NetworkContacts> = derived(
	[contacts, tokenWithFallback],
	([$contacts, $tokenWithFallback]) => {
		const isIcpToken = isTokenIcp($tokenWithFallback);
		const isIcrcToken = isTokenIcrc($tokenWithFallback);

		const allIcNetworkContacts = getNetworkContacts({ addressType: 'Icrcv2', contacts: $contacts });

		const duplicatedAccountIdentifiersByContactId = Object.keys(allIcNetworkContacts).reduce<
			Record<string, string[]>
		>((acc, key) => {
			const { address, contact } = allIcNetworkContacts[key];

			if (isIcrcAddress(address)) {
				const accountIdentifierText = tryToParseIcrcAccountStringToAccountIdentifierText(address);

				return {
					...acc,
					...(nonNullish(accountIdentifierText) && {
						[contact.id.toString()]: [...(acc[contact.id.toString()] ?? []), accountIdentifierText]
					})
				};
			}

			return acc;
		}, {});

		return Object.keys(allIcNetworkContacts).reduce<NetworkContacts>((acc, key) => {
			const { address, contact } = allIcNetworkContacts[key];

			// if ICP token, we display all unique principals and account identifiers
			// if account identifier is available in the addresses list as principal, we skip it
			const isValidIcpNetworkContact =
				isIcpToken &&
				!(duplicatedAccountIdentifiersByContactId[contact.id.toString()] ?? []).includes(address);

			// if ICRC token, we display all principals
			const isValidIcrcNetworkContact = isIcrcToken && isIcrcAddress(address);

			return {
				...acc,
				...(isValidIcpNetworkContact || isValidIcrcNetworkContact
					? { [key]: allIcNetworkContacts[key] }
					: {})
			};
		}, {});
	}
);
