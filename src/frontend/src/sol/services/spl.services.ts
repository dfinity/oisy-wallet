import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { listCustomTokens, setManyCustomTokens } from '$lib/api/backend.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenMetadata } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { get as getStorage } from '$lib/utils/storage.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { getTokenDecimals } from '$sol/api/solana.api';
import { splMetadata } from '$sol/rest/quicknode.rest';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import {
	SPL_USER_TOKENS_KEY,
	splUserTokensStore,
	type SplAddressMap
} from '$sol/stores/spl-user-tokens.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplUserToken } from '$sol/types/spl-user-token';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadSplTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultSplTokens(), loadSplUserTokens({ identity })]);
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

export const loadSplUserTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<SplUserToken[]>({
		request: () => loadUserTokens({ identity }),
		onLoad: loadUserTokenData,
		onCertifiedError: ({ error: err }) => {
			splUserTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.spl_user_tokens },
				err
			});
		},
		identity,
		strategy: 'query'
	});

// This function is a temporary solution: save the user tokens that we were caching in the browser into the backend.
// This is done to avoid any disruptions to the user experience, as the user tokens are not yet stored in the backend.
// However, it is acceptable to remove it after a certain amount of time, since we expect that most of the users
// that consider this part relevant will log in before that time.
// So, as timeline, we define a period of 1 month, more or less, to remove this function and its usage.
// That is enough time for the users to log in and have their tokens saved in the backend.
// The release before this change was v0.22.0, as reference.
// TODO: remove this function and its usage starting from the 1st of March 2025
const saveCachedUserTokensToBackend = async ({
	identity
}: {
	identity: Identity;
}): Promise<void> => {
	const contractsMap: SplAddressMap = getStorage<SplAddressMap>({ key: SPL_USER_TOKENS_KEY }) ?? {};
	const principal = identity.getPrincipal().toString();
	const contracts = nonNullish(principal) ? (contractsMap[principal] ?? []) : [];

	const tokens = await Promise.all(
		contracts.map(async (address) => {
			const network = SOLANA_MAINNET_NETWORK;

			const solNetwork = mapNetworkIdToNetwork(network.id);

			assertNonNullish(
				solNetwork,
				replacePlaceholders(get(i18n).init.error.no_solana_network, {
					$network: network.id.description ?? ''
				})
			);

			const metadata = await getSplMetadata({ address, network: solNetwork });

			return {
				address,
				enabled: true,
				...metadata
			};
		})
	);

	await setManyCustomTokens({
		identity,
		tokens: tokens.map((token) => toCustomToken({ ...token, networkKey: 'SplMainnet' })),
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
};

const loadSplCustomTokens = async (params: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<SplTokenAddress[]> => {
	const tokens = await listCustomTokens({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	// We filter the custom tokens that are Spl (the backend "Custom Token" potentially supports other types).
	return tokens.reduce<SplTokenAddress[]>(
		(acc, { token }) => ('SplMainnet' in token ? [...acc, token.SplMainnet.token_address] : acc),
		[]
	);
};

export const loadUserTokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<SplUserToken[]> => {
	const loadUserContracts = async (): Promise<SplUserToken[]> => {
		if (isNullish(identity)) {
			await nullishSignOut();
			return [];
		}

		await saveCachedUserTokensToBackend({ identity });

		const splCustomTokenAddresses = await loadSplCustomTokens({ identity, certified: true });

		const [existingTokens, userTokenAddresses] = splCustomTokenAddresses.reduce<
			[SplUserToken[], SplTokenAddress[]]
		>(
			([accExisting, accUser], address) => {
				const existingTokens = SPL_TOKENS.reduce<SplUserToken[]>(
					(acc, token) =>
						splCustomTokenAddresses.includes(token.address)
							? [...acc, { ...token, enabled: true }]
							: acc,
					[]
				);

				return existingTokens.length > 0
					? [[...accExisting, ...existingTokens], accUser]
					: [accExisting, [...accUser, address]];
			},
			[[], []]
		);

		const userTokens = await Promise.all(
			userTokenAddresses.map(async (address) => {
				// TODO: add checks for the network, when we have the backend
				const network = SOLANA_MAINNET_NETWORK;

				const solNetwork = mapNetworkIdToNetwork(network.id);

				assertNonNullish(
					solNetwork,
					replacePlaceholders(get(i18n).init.error.no_solana_network, {
						$network: network.id.description ?? ''
					})
				);

				const metadata = await getSplMetadata({ address, network: solNetwork });

				return {
					id: parseTokenId(`user-token#${metadata.symbol}#${network.chainId}`),
					network,
					address,
					standard: 'spl' as const,
					category: 'custom' as const,
					enabled: true,
					...metadata
				};
			})
		);

		return [...existingTokens, ...userTokens];
	};

	return await loadUserContracts();
};

const loadUserTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: SplUserToken[];
}) => {
	splUserTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};

export const getSplMetadata = async ({
	address,
	network
}: {
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<TokenMetadata> => {
	const decimals = await getTokenDecimals({ address, network });

	const {
		result: {
			content: {
				metadata,
				links: { image: icon }
			}
		}
	} = await splMetadata({ tokenAddress: address });

	const { name, symbol } = metadata;

	return {
		decimals,
		name,
		symbol,
		icon
	};
};
