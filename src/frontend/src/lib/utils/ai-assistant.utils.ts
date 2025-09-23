import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { isIcrcAddress } from '$icp/utils/icrc-account.utils';
import type {
	AiAssistantContactUiMap,
	AiAssistantToken,
	ReviewSendTokensToolResult,
	ShowContactsToolResult,
	ToolCallArgument
} from '$lib/types/ai-assistant';
import type { ExtendedAddressContactUiMap } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { isTokenNonFungible } from '$lib/utils/nft.utils';
import { jsonReplacer, nonNullish, notEmptyString } from '@dfinity/utils';

export const parseToAiAssistantContacts = (
	extendedAddressContacts: ExtendedAddressContactUiMap
): AiAssistantContactUiMap =>
	Object.keys(extendedAddressContacts).reduce<AiAssistantContactUiMap>((acc, contactId) => {
		const { name, addresses } = extendedAddressContacts[contactId];

		return {
			...acc,
			[contactId]: {
				name,
				addresses: addresses.map(({ address, addressType, ...restAddress }) => ({
					acceptedTokenStandards:
						addressType === 'Btc'
							? ['bitcoin']
							: addressType === 'Icrcv2'
								? !isIcrcAddress(address)
									? ['icp']
									: ['icp', 'icrc']
								: addressType === 'Sol'
									? ['solana', 'spl']
									: addressType === 'Eth'
										? // We do not include NFT standards here until the console can handle sending them
											['ethereum', 'erc20', 'dip20']
										: [],
					addressType,
					...restAddress
				}))
			}
		};
	}, {});

export const parseToAiAssistantTokens = (tokens: Token[]): AiAssistantToken[] =>
	tokens.reduce<AiAssistantToken[]>((acc, token) => {
		// We do not yet support sending NFTs via the AI console
		if (isTokenNonFungible(token)) {
			return acc;
		}

		const {
			name,
			standard,
			symbol,
			network: { id: networkId }
		} = token;

		return [
			...acc,
			{
				name,
				symbol,
				standard,
				networkId: networkId.description ?? ''
			}
		];
	}, []);

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
	const {
		selectedContactAddressIdFilter,
		amountNumberFilter,
		tokenSymbolFilter,
		addressFilter,
		networkIdFilter
	} = filterParams.reduce<{
		selectedContactAddressIdFilter?: string;
		amountNumberFilter?: string;
		tokenSymbolFilter?: string;
		addressFilter?: string;
		networkIdFilter?: string;
	}>(
		(acc, { value, name }) => ({
			selectedContactAddressIdFilter:
				name === 'selectedContactAddressId' ? value : acc.selectedContactAddressIdFilter,
			addressFilter: name === 'address' ? value : acc.addressFilter,
			amountNumberFilter: name === 'amountNumber' ? value : acc.amountNumberFilter,
			tokenSymbolFilter: name === 'tokenSymbol' ? value : acc.tokenSymbolFilter,
			networkIdFilter: name === 'networkId' ? value : acc.networkIdFilter
		}),
		{
			selectedContactAddressIdFilter: undefined,
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
				({ id: addressId }) => addressId === selectedContactAddressIdFilter
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
		token: tokenWithFallback,
		sendCompleted: false,
		id: crypto.randomUUID().toString()
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
