import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type {
	AiAssistantContactUi,
	AiAssistantContactUiMap,
	ReviewSendTokensToolResult,
	ShowContactsToolResult,
	ToolCallArgument
} from '$lib/types/ai-assistant';
import type { ExtendedAddressContactUi, ExtendedAddressContactUiMap } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { jsonReplacer, nonNullish, notEmptyString } from '@dfinity/utils';

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

export const parseShowFilteredContactsToolArguments = ({
	filterParams,
	extendedAddressContacts
}: {
	filterParams: ToolCallArgument[];
	extendedAddressContacts: ExtendedAddressContactUiMap;
}): ShowContactsToolResult => {
	const addressIdsFilter = filterParams.find(({ name }) => name === 'addressIds')?.value ?? '[]';

	const addressIds = JSON.parse(addressIdsFilter, jsonReplacer);

	if (addressIds.length === 0) {
		return { contacts: [] };
	}

	return Object.values(extendedAddressContacts).reduce<ShowContactsToolResult>(
		(acc, extendedAddressContactUi) => {
			const addresses = extendedAddressContactUi.addresses.filter(({ id: addressId }) =>
				addressIds.includes(addressId)
			);

			if (addresses.length > 0) {
				return {
					...acc,
					contacts: [
						...acc.contacts,
						{
							...extendedAddressContactUi,
							addresses
						}
					]
				};
			}

			return acc;
		},
		{ contacts: [] }
	);
};

export const parseReviewSendTokensToolArguments = ({
	filterParams,
	tokens,
	extendedAddressContacts
}: {
	filterParams: ToolCallArgument[];
	tokens: Token[];
	extendedAddressContacts: ExtendedAddressContactUiMap;
}): ReviewSendTokensToolResult => {
	const { addressIdFilter, amountNumberFilter, tokenSymbolFilter, addressFilter, networkIdFilter } =
		filterParams.reduce<{
			addressIdFilter?: string;
			amountNumberFilter?: string;
			tokenSymbolFilter?: string;
			addressFilter?: string;
			networkIdFilter?: string;
		}>(
			(acc, { value, name }) => ({
				addressIdFilter: name === 'addressId' ? value : acc.addressIdFilter,
				addressFilter: name === 'address' ? value : acc.addressFilter,
				amountNumberFilter: name === 'amountNumber' ? value : acc.amountNumberFilter,
				tokenSymbolFilter: name === 'tokenSymbol' ? value : acc.tokenSymbolFilter,
				networkIdFilter: name === 'networkId' ? value : acc.networkIdFilter
			}),
			{
				addressIdFilter: undefined,
				amountNumberFilter: undefined,
				tokenSymbolFilter: undefined,
				addressFilter: undefined,
				networkIdFilter: undefined
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
		tokens.find(
			({ id, network: { id: networkId } }) =>
				id.description === tokenSymbolFilter && networkId.description === networkIdFilter
		) ?? ICP_TOKEN;

	const parsedAmount = Number(amountNumberFilter);

	return {
		contact,
		contactAddress,
		address: addressFilter,
		amount: parsedAmount,
		token: tokenWithFallback
	};
};

export const generateAiAssistantResponseEventMetadata = ({
	requestStartTimestamp,
	toolName
}: {
	requestStartTimestamp: number;
	toolName?: string;
}) => {
	const responseTimeMs = Date.now() - requestStartTimestamp;

	return {
		...(notEmptyString(toolName) && { toolName }),
		responseTime: `${responseTimeMs / 1000}s`,
		responseTimeCategory:
			responseTimeMs <= 100
				? '0-100'
				: responseTimeMs <= 500
					? '101-500'
					: responseTimeMs <= 1000
						? '501-1000'
						: responseTimeMs <= 2000
							? '1001-2000'
							: responseTimeMs <= 5000
								? '2001-5000'
								: responseTimeMs <= 10000
									? '5001-10000'
									: responseTimeMs <= 20000
										? '10001-20000'
										: responseTimeMs <= 100000
											? '20001-100000'
											: '100000+'
	};
};
