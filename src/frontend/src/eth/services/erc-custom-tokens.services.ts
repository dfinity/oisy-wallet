import type { CustomToken } from '$declarations/backend/backend.did';
import type { EthereumNetwork } from '$eth/types/network';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import type { SaveCustomErc1155Variant, SaveCustomErc721Variant } from '$lib/types/custom-token';
import type { OwnedContract } from '$lib/types/nft';
import type { NonEmptyArray } from '$lib/types/utils';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

export const saveErcCustomTokens = async ({
	contracts,
	customTokens,
	network,
	identity
}: {
	contracts: OwnedContract[];
	customTokens: CustomToken[];
	network: EthereumNetwork;
	identity: Identity;
}) => {
	const [erc721Tokens, erc1155Tokens] = contracts.reduce<
		[SaveCustomErc721Variant[], SaveCustomErc1155Variant[]]
	>(
		(acc, { standard: rawStandard, address }) => {
			const [erc721TokensAcc, erc1155TokensAcc] = acc;

			const standard = rawStandard.toLowerCase();

			if (standard === 'erc721') {
				const existingToken = customTokens.find(({ token }) => {
					if (!('Erc721' in token)) {
						return false;
					}

					const {
						Erc721: { token_address: tokenAddress, chain_id: tokenChainId }
					} = token;

					return (
						areAddressesEqual({
							address1: tokenAddress,
							address2: address,
							networkId: network.id
						}) && tokenChainId === network.chainId
					);
				});

				if (nonNullish(existingToken)) {
					return acc;
				}

				const newToken: SaveCustomErc721Variant = {
					address,
					chainId: network.chainId,
					networkKey: 'Erc721',
					enabled: true
				};

				erc721TokensAcc.push(newToken);

				return [erc721TokensAcc, erc1155TokensAcc];
			}

			if (standard === 'erc1155') {
				const existingToken = customTokens.find(({ token }) => {
					if (!('Erc1155' in token)) {
						return false;
					}

					const {
						Erc1155: { token_address: tokenAddress, chain_id: tokenChainId }
					} = token;

					return (
						areAddressesEqual({
							address1: tokenAddress,
							address2: address,
							networkId: network.id
						}) && tokenChainId === network.chainId
					);
				});

				if (nonNullish(existingToken)) {
					return acc;
				}

				const newToken: SaveCustomErc1155Variant = {
					address,
					chainId: network.chainId,
					networkKey: 'Erc1155',
					enabled: true
				};

				erc1155TokensAcc.push(newToken);

				return [erc721TokensAcc, erc1155TokensAcc];
			}

			return acc;
		},
		[[], []]
	);

	const ercTokens = [...erc721Tokens, ...erc1155Tokens];

	if (ercTokens.length === 0) {
		return;
	}

	await saveCustomTokens({
		tokens: ercTokens as NonEmptyArray<SaveCustomErc721Variant | SaveCustomErc1155Variant>,
		identity
	});
};
