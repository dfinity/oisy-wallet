<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Identity } from '@icp-sdk/core/agent';
	import { page } from '$app/state';
	import type { CustomToken } from '$declarations/backend/backend.did';
	import { EXT_BUILTIN_TOKENS } from '$env/tokens/tokens-ext/tokens.ext.env';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { saveErcCustomTokens } from '$eth/services/erc-custom-tokens.services';
	import type { EthereumNetwork } from '$eth/types/network';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
	import { getTokensByOwner } from '$icp/api/ext-v2-token.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import {
		COLLECTION_TIMER_INTERVAL_MILLIS,
		MILLISECONDS_IN_DAY
	} from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
	import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
	import { backendCustomTokens } from '$lib/stores/backend-custom-tokens.store';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { OisyReloadCollectionsEvent } from '$lib/types/custom-events';
	import type { SaveCustomExtVariant } from '$lib/types/custom-token';
	import type { OwnedContract } from '$lib/types/nft';
	import type { NonEmptyArray } from '$lib/types/utils';
	import { isRouteActivity, isRouteNfts } from '$lib/utils/nav.utils';

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

		// For now, we have no other way of knowing what EXT tokens/collections the user has NFT with.
		// So, we loop through a curated list, and we use the method `getTokensByOwner` to check if the user has any NFTs from that collection.
		// TODO: Find a better method of `getTokensByOwner` to know if the user has NFTs from a specific collection.
		const canisterIdPromises = EXT_BUILTIN_TOKENS.map(async ({ canisterId }) => {
			if (extEnabledCustomToken.includes(canisterId)) {
				return [];
			}

			try {
				const tokens = await getTokensByOwner({
					identity,
					owner: identity.getPrincipal(),
					canisterId,
					certified: false
				});

				return tokens.length > 0 ? [canisterId] : [];
			} catch (error: unknown) {
				console.warn(`Error fetching EXT tokens from canister ${canisterId}:`, error);

				return [];
			}
		});

		const canisterIds = (await Promise.all(canisterIdPromises)).flat();

		if (canisterIds.length === 0) {
			return;
		}

		const extTokens: SaveCustomExtVariant[] = canisterIds.map((canisterId) => ({
			canisterId,
			networkKey: 'ExtV2',
			enabled: true
		}));

		await saveCustomTokens({
			tokens: extTokens as NonEmptyArray<SaveCustomExtVariant>,
			identity
		});
	};

	const load = async ({ extTokens }: { extTokens: boolean }) => {
		if (isNullish($authIdentity)) {
			return;
		}

		const params: LoadTokensParams = {
			identity: $authIdentity,
			customTokens: $backendCustomTokens
		};

		try {
			await Promise.all([
				loadErcTokens(params),
				extTokens ? loadExtTokens(params) : Promise.resolve()
			]);
		} catch (_: unknown) {
			// no need to raise the error, but we should reload the custom tokens, just to avoid that it is caused by outdated tokens
			await loadNetworkCustomTokens({
				identity: $authIdentity,
				certified: true
			});
		}
	};

	const onLoad = async () => {
		await load({ extTokens: false });
	};

	const reload = async (event?: CustomEvent<OisyReloadCollectionsEvent>) => {
		await load({ extTokens: true });

		event?.detail.callback?.();
	};

	// If we are not in NFTs page or Activity page, there is no need to reload collections frequently.
	// In fact, we can disable it, giving it a very high interval.
	let isNftsPage = $derived(isRouteNfts(page));
	let isActivityPage = $derived(isRouteActivity(page));
	let interval = $derived(
		isNftsPage || isActivityPage ? COLLECTION_TIMER_INTERVAL_MILLIS : MILLISECONDS_IN_DAY
	);
</script>

<svelte:window onoisyReloadCollections={reload} />

<IntervalLoader {interval} {onLoad} />
