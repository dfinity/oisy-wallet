import type { CustomToken } from '$declarations/backend/backend.did';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { getIdbSolTokens, setIdbSolTokens } from '$lib/api/idb-tokens.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenMetadata } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { getTokenDecimals, getTokenOwner } from '$sol/api/solana.api';
import { splMetadata } from '$sol/rest/quicknode.rest';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import {
	assertNonNullish,
	fromNullable,
	isNullish,
	nonNullish,
	queryAndUpdate
} from '@dfinity/utils';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { get } from 'svelte/store';

export const loadSplTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultSplTokens(), loadCustomTokens({ identity })]);
};

const loadDefaultSplTokens = (): ResultSuccess => {
	try {
		splDefaultTokensStore.set(SPL_TOKENS);
	} catch (err: unknown) {
		splDefaultTokensStore.reset();

		toastsError({
			msg: { text: get(i18n).init.error.spl_tokens },
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const loadCustomTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<SplCustomToken[]>({
		request: () => loadCustomTokensWithMetadata({ identity }),
		onLoad: loadCustomTokenData,
		onUpdateError: ({ error: err }) => {
			splCustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.spl_user_tokens },
				err
			});
		},
		identity,
		strategy: 'query'
	});

const loadSplCustomTokens = async ({
	identity,
	certified
}: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<CustomToken[]> =>
	await loadNetworkCustomTokens({
		identity,
		certified,
		filterTokens: ({ token }) => 'SplMainnet' in token || 'SplDevnet' in token,
		setIdbTokens: setIdbSolTokens,
		getIdbTokens: getIdbSolTokens
	});

export const loadCustomTokensWithMetadata = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<SplCustomToken[]> => {
	const loadCustomContracts = async (): Promise<SplCustomToken[]> => {
		if (isNullish(identity)) {
			await nullishSignOut();
			return [];
		}

		const splCustomTokens = await loadSplCustomTokens({ identity, certified: true });

		const [existingTokens, nonExistingTokens] = splCustomTokens.reduce<
			[SplCustomToken[], SplCustomToken[]]
		>(
			([accExisting, accNonExisting], { token, enabled, version: versionNullable }) => {
				if (!('SplMainnet' in token || 'SplDevnet' in token)) {
					return [accExisting, accNonExisting];
				}

				const version = fromNullable(versionNullable);

				const {
					network: tokenNetwork,
					symbol,
					decimals,
					token_address: tokenAddress
				} = 'SplDevnet' in token
					? { ...token.SplDevnet, network: SOLANA_DEVNET_NETWORK }
					: { ...token.SplMainnet, network: SOLANA_MAINNET_NETWORK };

				const existingToken = SPL_TOKENS.find(
					({ address, network: { id: networkId } }) =>
						address === tokenAddress && networkId === tokenNetwork.id
				);

				if (nonNullish(existingToken)) {
					return [[...accExisting, { ...existingToken, enabled, version }], accNonExisting];
				}

				return [
					accExisting,
					[
						...accNonExisting,
						{
							id: parseTokenId(`custom-token#${fromNullable(symbol)}#${tokenNetwork.chainId}`),
							name: tokenAddress,
							address: tokenAddress,
							// TODO: save this value to the backend too
							owner: TOKEN_PROGRAM_ADDRESS,
							network: tokenNetwork,
							symbol: fromNullable(symbol) ?? '',
							decimals: fromNullable(decimals) ?? SOLANA_DEFAULT_DECIMALS,
							standard: 'spl' as const,
							category: 'custom' as const,
							enabled,
							version
						}
					]
				];
			},
			[[], []]
		);

		const customTokens: SplCustomToken[] = await nonExistingTokens.reduce<
			Promise<SplCustomToken[]>
		>(async (acc, token) => {
			const { network, address } = token;

			const solNetwork = mapNetworkIdToNetwork(network.id);

			assertNonNullish(
				solNetwork,
				replacePlaceholders(get(i18n).init.error.no_solana_network, {
					$network: network.id.description ?? ''
				})
			);

			const owner = await getTokenOwner({ address, network: solNetwork });

			if (isNullish(owner)) {
				return acc;
			}

			const metadata = await getSplMetadata({ address, network: solNetwork });

			return nonNullish(metadata)
				? [
						...(await acc),
						{
							...token,
							owner,
							...metadata
						}
					]
				: acc;
		}, Promise.resolve([]));

		return [...existingTokens, ...customTokens];
	};

	return await loadCustomContracts();
};

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: SplCustomToken[];
}) => {
	splCustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};

export const getSplMetadata = async ({
	address,
	network
}: {
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<TokenMetadata | undefined> => {
	const decimals = await getTokenDecimals({ address, network });

	try {
		const metadataResult = await splMetadata({ tokenAddress: address, network });

		if (isNullish(metadataResult)) {
			return;
		}

		const {
			result: {
				content: {
					metadata: { name, symbol },
					links: { image: icon }
				}
			}
		} = metadataResult;

		return {
			decimals,
			name,
			symbol,
			icon
		};
	} catch (err: unknown) {
		// We care only for development purposes.
		console.warn(`Failed to fetch SPL metadata for token ${address} on ${network} network`, err);
	}
};
