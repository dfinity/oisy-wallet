<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Identity } from '@icp-sdk/core/agent';
	import { get } from 'svelte/store';
	import type { CustomToken } from '$declarations/backend/backend.did';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { EXT_BUILTIN_TOKENS } from '$env/tokens/tokens-ext/tokens.ext.env';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { saveErcCustomTokens } from '$eth/services/erc-custom-tokens.services';
	import type { EthereumNetwork } from '$eth/types/network';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
	import { getTokensByOwner } from '$icp/api/ext-v2-token.api';
	import { saveCustomTokens } from '$icp/services/ext-custom-tokens.services';
	import type { SaveExtCustomToken } from '$icp/types/ext-custom-token';
	import { listCustomTokens } from '$lib/api/backend.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { COLLECTION_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { OwnedContract } from '$lib/types/nft';
	import type { NonEmptyArray } from '$lib/types/utils';

	const loadContracts = async (network: EthereumNetwork): Promise<OwnedContract[]> => {
		if (isNullish($ethAddress)) {
			return [];
		}

		const { getTokensForOwner } = alchemyProviders(network.id);

		try {
			return await getTokensForOwner($ethAddress);
		} catch (_: unknown) {
			return [];
		}
	};

	interface LoadTokensParams {
		identity: Identity;
		customTokens: CustomToken[];
	}

	const loadErcTokens = async ({ identity, customTokens }: LoadTokensParams) => {
		const networks = [...$enabledEthereumNetworks, ...$enabledEvmNetworks];

		for (const network of networks) {
			const contracts: OwnedContract[] = await loadContracts(network);

			await saveErcCustomTokens({
				contracts,
				customTokens,
				network,
				identity
			});
		}
	};

	const loadExtTokens = async ({ identity, customTokens }: LoadTokensParams) => {
		const extEnabledCustomToken = customTokens.reduce<CanisterIdText[]>(
			(acc, { token, enabled }) =>
				'ExtV2' in token && enabled ? [...acc, token.ExtV2.canister_id.toText()] : acc,
			[]
		);

		const canisterIds = await EXT_BUILTIN_TOKENS.reduce<Promise<CanisterIdText[]>>(
			async (acc, { canisterId }) => {
				if (extEnabledCustomToken.includes(canisterId)) {
					return await acc;
				}

				try {
					const tokens = await getTokensByOwner({
						identity,
						owner: identity.getPrincipal(),
						canisterId
					});

					return tokens.length > 0 ? [...(await acc), canisterId] : await acc;
				} catch (error: unknown) {
					console.warn(`Error fetching EXT tokens from canister ${canisterId}:`, error);

					return await acc;
				}
			},
			Promise.resolve([])
		);

		if (canisterIds.length === 0) {
			return;
		}

		const extTokens: SaveExtCustomToken[] = canisterIds.map((canisterId) => ({
			canisterId,
			network: ICP_NETWORK,
			enabled: true
		}));

		await saveCustomTokens({
			tokens: extTokens as NonEmptyArray<SaveExtCustomToken>,
			identity
		});
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED || isNullish($authIdentity)) {
			return;
		}

		const customTokens = await listCustomTokens({
			identity: $authIdentity,
			certified: true,
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});

		const params: LoadTokensParams = {
			identity: $authIdentity,
			customTokens
		};

		await Promise.all([loadErcTokens(params), loadExtTokens(params)]);
	};
</script>

<IntervalLoader interval={COLLECTION_TIMER_INTERVAL_MILLIS} {onLoad} />
