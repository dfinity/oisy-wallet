<script lang="ts">
	import { isNullish, nonNullish, queryAndUpdate } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import type { CustomToken } from '$declarations/backend/backend.did';
	import { processCustomTokens as processErc1155CustomTokens } from '$eth/services/erc1155.services';
	import {
		loadDefaultErc20Tokens,
		processCustomTokens as processErc20CustomTokens
	} from '$eth/services/erc20.services';
	import {
		loadDefaultErc4626Tokens,
		processCustomTokens as processErc4626CustomTokens
	} from '$eth/services/erc4626.services';
	import { processCustomTokens as processErc721CustomTokens } from '$eth/services/erc721.services';
	import {
		loadDefaultExtTokens,
		processCustomTokens as processExtCustomTokens
	} from '$icp/services/ext.services';
	import {
		loadDefaultIcPunksTokens,
		processCustomTokens as processIcPunksCustomTokens
	} from '$icp/services/icpunks.services';
	import {
		loadDefaultIcrcTokens,
		processCustomTokens as processIcrcCustomTokens
	} from '$icp/services/icrc.services';
	import LoaderCollections from '$lib/components/loaders/LoaderCollections.svelte';
	import LoaderNfts from '$lib/components/loaders/LoaderNfts.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		ethAddress,
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		networkEthereumEnabled,
		networkEvmMainnetEnabled,
		networkEvmTestnetEnabled,
		networkSepoliaEnabled,
		networkSolanaDevnetEnabled,
		networkSolanaLocalEnabled,
		networkSolanaMainnetEnabled
	} from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { LoadCustomTokenParams } from '$lib/types/custom-token';
	import type { OptionIdentity } from '$lib/types/identity';
	import {
		loadDefaultSplTokens,
		processCustomTokens as processSplCustomTokens
	} from '$sol/services/spl.services';

	// IC default tokens have no reactive guards, they load once when the component mounts (no tracked dependencies).
	$effect(() => {
		loadDefaultIcrcTokens();
		loadDefaultExtTokens();
		loadDefaultIcPunksTokens();
	});

	let loadErc = $derived(
		nonNullish($ethAddress) &&
			($networkEthereumEnabled ||
				$networkEvmMainnetEnabled ||
				($testnetsEnabled && ($networkSepoliaEnabled || $networkEvmTestnetEnabled)))
	);

	$effect(() => {
		if (loadErc) {
			loadDefaultErc20Tokens();
			loadDefaultErc4626Tokens();
		}
	});

	let loadSplMainnet = $derived(nonNullish($solAddressMainnet) && $networkSolanaMainnetEnabled);
	let loadSplDevnet = $derived(
		$testnetsEnabled && nonNullish($solAddressDevnet) && $networkSolanaDevnetEnabled
	);
	let loadSplLocal = $derived(
		$testnetsEnabled && LOCAL && nonNullish($solAddressLocal) && $networkSolanaLocalEnabled
	);
	let loadSpl = $derived(loadSplMainnet || loadSplDevnet || loadSplLocal);

	$effect(() => {
		if (loadSpl) {
			loadDefaultSplTokens();
		}
	});

	// =====================================================================
	// Custom token loading — single backend fetch, distributed to loaders
	// =====================================================================
	// Previously each loader independently called `list_custom_tokens` via
	// `queryAndUpdate`, producing up to 16 concurrent backend calls (8 loaders
	// × query + update). Since `list_custom_tokens` was moved to an update
	// call, these became slow and error-prone.
	//
	// Now we fetch once and fan the result out to per-standard processors.

	interface FetchedTokensState {
		tokens: CustomToken[];
		certified: boolean;
		// Identity is bundled here so the processing effect below doesn't need
		// to read `$authIdentity` directly, avoiding a spurious re-trigger
		// (old tokens + new identity) when identity changes.
		identity: OptionIdentity;
	}

	let fetchedTokens = $state<FetchedTokensState | undefined>();

	// Guards against stale callbacks from a previous identity's in-flight `queryAndUpdate`.
	// When identity changes the effect re-runs and bumps the counter; lingering `onLoad`/`onUpdateError`
	// callbacks from the old request see a mismatched generation and bail out.
	let fetchGeneration = 0;

	// Single queryAndUpdate pipeline — re-runs only when identity changes.
	$effect(() => {
		const identity = $authIdentity;
		const generation = ++fetchGeneration;

		queryAndUpdate<CustomToken[]>({
			request: ({ certified }) => loadNetworkCustomTokens({ certified, identity, useCache: true }),
			onLoad: ({ response: tokens, certified }) => {
				if (generation !== fetchGeneration) {
					return;
				}

				fetchedTokens = { tokens, certified, identity };
			},
			onUpdateError: ({ error: err }) => {
				if (generation !== fetchGeneration) {
					return;
				}

				toastsError({
					msg: { text: get(i18n).init.error.custom_tokens },
					err
				});
			},
			identity
		});
	});

	// Fan-out: distribute pre-fetched tokens to per-standard processors.
	$effect(() => {
		if (isNullish(fetchedTokens)) {
			return;
		}

		const { tokens, certified, identity } = fetchedTokens;

		const params: LoadCustomTokenParams = { tokens, certified, identity };

		processIcrcCustomTokens(params);
		processExtCustomTokens(params);
		processIcPunksCustomTokens(params);

		if (loadErc) {
			processErc20CustomTokens(params);
			processErc721CustomTokens(params);
			processErc1155CustomTokens(params);
			processErc4626CustomTokens(params);
		}

		if (loadSpl) {
			processSplCustomTokens(params);
		}
	});
</script>

<LoaderCollections />

<LoaderNfts />
