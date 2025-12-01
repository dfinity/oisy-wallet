import type { CustomToken } from '$declarations/backend/backend.did';
import { saveCustomTokens as saveErc1155CustomTokens } from '$eth/services/erc1155-custom-tokens.services';
import { saveCustomTokens as saveErc721CustomTokens } from '$eth/services/erc721-custom-tokens.services';
import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
import type { EthereumNetwork } from '$eth/types/network';
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
		[SaveErc721CustomToken[], SaveErc1155CustomToken[]]
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

				const newToken: SaveErc721CustomToken = {
					address,
					network,
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

				const newToken: SaveErc1155CustomToken = {
					address,
					network,
					enabled: true
				};

				erc1155TokensAcc.push(newToken);

				return [erc721TokensAcc, erc1155TokensAcc];
			}

			return acc;
		},
		[[], []]
	);

	await Promise.all([
		erc721Tokens.length > 0 &&
			saveErc721CustomTokens({
				tokens: erc721Tokens as NonEmptyArray<SaveErc721CustomToken>,
				identity
			}),
		erc1155Tokens.length > 0 &&
			saveErc1155CustomTokens({
				tokens: erc1155Tokens as NonEmptyArray<SaveErc1155CustomToken>,
				identity
			})
	]);
};
