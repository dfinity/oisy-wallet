import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type {
	AiAssistantContactUi,
	AiAssistantContactUiMap,
	ReviewSendTokensToolResult,
	ToolCallArgument
} from '$lib/types/ai-assistant';
import type { ExtendedAddressContactUi, ExtendedAddressContactUiMap } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

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

export const parseReviewSendTokensToolArguments = ({
	filterParams,
	tokens,
	extendedAddressContacts
}: {
	filterParams: ToolCallArgument[];
	tokens: Token[];
	extendedAddressContacts: ExtendedAddressContactUiMap;
}): ReviewSendTokensToolResult => {
	const { addressIdFilter, amountNumberFilter, tokenSymbolFilter, addressFilter } =
		filterParams.reduce<{
			addressIdFilter?: string;
			amountNumberFilter?: string;
			tokenSymbolFilter?: string;
			addressFilter?: string;
		}>(
			(acc, { value, name }) => ({
				addressIdFilter: name === 'addressId' ? value : acc.addressIdFilter,
				addressFilter: name === 'address' ? value : acc.addressFilter,
				amountNumberFilter: name === 'amountNumber' ? value : acc.amountNumberFilter,
				tokenSymbolFilter: name === 'tokenSymbol' ? value : acc.tokenSymbolFilter
			}),
			{
				addressIdFilter: undefined,
				amountNumberFilter: undefined,
				tokenSymbolFilter: undefined,
				addressFilter: undefined
			}
		);

	const { contact, contactAddress } = Object.values(extendedAddressContacts).reduce<
		Pick<ReviewSendTokensToolResult, 'contact' | 'contactAddress'>
	>(
		(acc, extendedAddressContactUi) => {
			const address = extendedAddressContactUi.addresses.find(
				({ id: addressId }) => addressId === addressIdFilter
			);

			if (nonNullish(address)) {
				return {
					contact: extendedAddressContactUi,
					contactAddress: address
				};
			}

			return acc;
		},
		{ contact: undefined, contactAddress: undefined }
	);

	const tokenWithFallback =
		tokens.find(({ id }) => id.description === tokenSymbolFilter) ?? ICP_TOKEN;

	const parsedAmount = Number(amountNumberFilter);

	return {
		contact,
		contactAddress,
		address: addressFilter,
		amount: parsedAmount,
		token: tokenWithFallback
	};
};
