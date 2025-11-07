<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { erc1155CustomTokensNotInitialized } from '$eth/derived/erc1155.derived';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { erc721CustomTokensNotInitialized } from '$eth/derived/erc721.derived';
	import {
		enabledEthereumNetworks,
		enabledEthereumNetworksChainIds
	} from '$eth/derived/networks.derived';
	import { loadErc1155Tokens } from '$eth/services/erc1155.services';
	import { loadErc20Tokens } from '$eth/services/erc20.services';
	import { loadErc721Tokens } from '$eth/services/erc721.services';
	import { enabledEvmNetworks, enabledEvmNetworksChainIds } from '$evm/derived/networks.derived';
	import { loadIcrcTokens } from '$icp/services/icrc.services';
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
	import { splCustomTokensNotInitialized } from '$sol/derived/spl.derived';
	import { loadSplTokens } from '$sol/services/spl.services';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	$effect(() => {
		loadIcrcTokens({ identity: $authIdentity });
	});

	let loadErc = $derived(
		nonNullish($ethAddress) &&
			($networkEthereumEnabled ||
				$networkEvmMainnetEnabled ||
				($testnetsEnabled && ($networkSepoliaEnabled || $networkEvmTestnetEnabled)))
	);
	let loadErc20 = $derived(loadErc && $erc20UserTokensNotInitialized);
	let loadErc721 = $derived(loadErc && $erc721CustomTokensNotInitialized && NFTS_ENABLED);
	let loadErc1155 = $derived(loadErc && $erc1155CustomTokensNotInitialized && NFTS_ENABLED);

	let loadSplMainnet = $derived(nonNullish($solAddressMainnet) && $networkSolanaMainnetEnabled);
	let loadSplDevnet = $derived(
		$testnetsEnabled && nonNullish($solAddressDevnet) && $networkSolanaDevnetEnabled
	);
	let loadSplLocal = $derived(
		$testnetsEnabled && LOCAL && nonNullish($solAddressLocal) && $networkSolanaLocalEnabled
	);
	let loadSpl = $derived(
		(loadSplMainnet || loadSplDevnet || loadSplLocal) && $splCustomTokensNotInitialized
	);

	let ercNetworkChainIds = $derived([
		...$enabledEthereumNetworksChainIds,
		...$enabledEvmNetworksChainIds
	]);

	$effect(() => {
		if (loadErc20) {
			loadErc20Tokens({ identity: $authIdentity, networkChainIds: ercNetworkChainIds });
		}
	});

	$effect(() => {
		if (loadErc721) {
			loadErc721Tokens({ identity: $authIdentity, networkChainIds: ercNetworkChainIds });
		}
	});

	$effect(() => {
		if (loadErc1155) {
			loadErc1155Tokens({ identity: $authIdentity, networkChainIds: ercNetworkChainIds });
		}
	});

	$effect(() => {
		if (loadSpl) {
			loadSplTokens({ identity: $authIdentity });
		}
	});
</script>

{@render children()}

<LoaderCollections />

<LoaderNfts />
