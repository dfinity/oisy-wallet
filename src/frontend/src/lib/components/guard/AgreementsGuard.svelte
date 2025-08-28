<script lang="ts">
	import { Modal, themeStore } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		loadBtcAddressMainnet,
		loadBtcAddressRegtest,
		loadBtcAddressTestnet
	} from '$btc/services/btc-address.services';
	import { erc1155CustomTokensInitialized } from '$eth/derived/erc1155.derived';
	import { erc721CustomTokensInitialized } from '$eth/derived/erc721.derived';
	import { loadErc1155Tokens } from '$eth/services/erc1155.services';
	import { loadErc20Tokens } from '$eth/services/erc20.services';
	import { loadErc721Tokens } from '$eth/services/erc721.services';
	import { loadEthAddress } from '$eth/services/eth-address.services';
	import { loadIcrcTokens } from '$icp/services/icrc.services';
	import LoaderCollections from '$lib/components/loaders/LoaderCollections.svelte';
	import LoaderNfts from '$lib/components/loaders/LoaderNfts.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet,
		ethAddress,
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import {
		hasAcceptedAllLatestAgreements,
		hasOutdatedAgreements,
		noAgreementVisionedYet
	} from '$lib/derived/agreements.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		networkBitcoinMainnetEnabled,
		networkBitcoinRegtestEnabled,
		networkBitcoinTestnetEnabled,
		networkEthereumEnabled,
		networkEvmMainnetEnabled,
		networkEvmTestnetEnabled,
		networkSepoliaEnabled,
		networkSolanaDevnetEnabled,
		networkSolanaLocalEnabled,
		networkSolanaMainnetEnabled
	} from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { ProgressStepsLoader } from '$lib/enums/progress-steps';
	import { initLoader } from '$lib/services/loader.services';
	import { loadNfts } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { loading } from '$lib/stores/loader.store';
	import { nftStore } from '$lib/stores/nft.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { emit } from '$lib/utils/events.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		loadSolAddressDevnet,
		loadSolAddressLocal,
		loadSolAddressMainnet
	} from '$sol/services/sol-address.services';
	import { loadSplTokens } from '$sol/services/spl.services';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let needToSignAgreements = $derived($noAgreementVisionedYet || $hasOutdatedAgreements);
</script>

{#if needToSignAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<Modal testId={LOADER_MODAL}>
			<div class="stretch"> MOCK MODAL to sign all agreements to whoever never did or to sign the outdated ones </div>
		</Modal>
	</div>
{:else if $hasAcceptedAllLatestAgreements}
	<div in:fade>
		{@render children()}
	</div>
{/if}
