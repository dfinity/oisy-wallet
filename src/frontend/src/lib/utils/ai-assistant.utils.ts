import type { AiAssistantContactUi, AiAssistantContactUiMap } from '$lib/types/ai-assistant';
import type { ExtendedAddressContactUi, ExtendedAddressContactUiMap } from '$lib/types/contact';

export const parseToAiAssistantContacts = (
	extendedAddressContacts: ExtendedAddressContactUiMap
): AiAssistantContactUiMap =>
	Object.keys(extendedAddressContacts).reduce<AiAssistantContactUiMap>((acc, contactId) => {
		const { name, id, addresses } = extendedAddressContacts[contactId];

		return {
			...acc,
			[contactId]: {
				name,
				id,
				addresses: addresses.map(({ address: _, ...restAddress }) => restAddress)
			}
		};
	}, {});

export const parseFromAiAssistantContacts = ({
	aiAssistantContacts,
	extendedAddressContacts
}: {
	aiAssistantContacts: AiAssistantContactUi[];
	extendedAddressContacts: ExtendedAddressContactUiMap;
}): ExtendedAddressContactUi[] =>
	aiAssistantContacts.reduce<ExtendedAddressContactUi[]>(
		(acc, { id, addresses }) => [
			...acc,
			{
				...extendedAddressContacts[`${id}`],
				addresses: extendedAddressContacts[`${id}`].addresses.filter(({ id: addressId }) =>
					addresses.some((filteredAddress) => filteredAddress.id === addressId)
				)
			}
		],
		[]
	);
