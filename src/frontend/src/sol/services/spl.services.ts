import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenMetadata } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
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
			msg: { text: get(i18n).init.error.spl_contract },
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

export const loadUserTokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<SplUserToken[]> => {
	// TODO: use the backend method when we add the SPL tokens to the backend, similar to ERC20
	const loadUserContracts = async (): Promise<SplUserToken[]> => {
		if (isNullish(identity)) {
			await nullishSignOut();
			return [];
		}

		const contractsMap: SplAddressMap =
			getStorage<SplAddressMap>({ key: SPL_USER_TOKENS_KEY }) ?? {};
		const principal = identity.getPrincipal().toString();
		const contracts = nonNullish(principal) ? (contractsMap[principal] ?? []) : [];

		const [existingTokens, userTokenAddresses] = contracts.reduce<
			[SplUserToken[], SplTokenAddress[]]
		>(
			([accExisting, accUser], address) => {
				const existingToken = SPL_TOKENS.find((token) => token.address === address);

				return nonNullish(existingToken)
					? [[...accExisting, { ...existingToken, enabled: true }], accUser]
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
			content: { metadata }
		}
	} = await splMetadata({ tokenAddress: address });

	const { name, symbol } = metadata;

	return {
		decimals,
		name,
		symbol
	};
};
