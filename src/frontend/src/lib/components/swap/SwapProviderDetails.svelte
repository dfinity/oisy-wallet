<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
	import { oisyTradeSwapEnabled } from '$env/oisy-trade-swap';
	import { KONGSWAP_PROVIDER_ENABLED } from '$env/rest/kongswap.env';
	import { LIFI_SWAP_ENABLED } from '$env/rest/lifi.env';
	import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
	import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
	import SwapDetailsChainFusion from '$lib/components/swap/SwapDetailsChainFusion.svelte';
	import SwapDetailsIcp from '$lib/components/swap/SwapDetailsIcp.svelte';
	import SwapDetailsKong from '$lib/components/swap/SwapDetailsKongSwap.svelte';
	import SwapDetailsLifi from '$lib/components/swap/SwapDetailsLifi.svelte';
	import SwapDetailsNearIntents from '$lib/components/swap/SwapDetailsNearIntents.svelte';
	import SwapDetailsOisyTrade from '$lib/components/swap/SwapDetailsOisyTrade.svelte';
	import SwapDetailsOneSec from '$lib/components/swap/SwapDetailsOneSec.svelte';
	import SwapDetailsVelora from '$lib/components/swap/SwapDetailsVelora.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
	import { findSwapProvider } from '$lib/utils/swap.utils';
	import { UrlSchema } from '$lib/validation/url.validation';

	interface Props {
		provider: SwapMappedResult;
		slippageValue: OptionAmount;
		// The provider step lists the website under each offer already.
		showWebsite?: boolean;
	}

	let { provider, slippageValue, showWebsite = true }: Props = $props();

	let displayURL = $derived.by(() => {
		const parsed = UrlSchema.safeParse(findSwapProvider(provider.provider)?.website);
		if (!parsed.success) {
			return null;
		}
		const { hostname } = new URL(parsed.data);
		return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
	});
</script>

{#if showWebsite && nonNullish(displayURL)}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.swap_provider_website}
		{/snippet}

		{#snippet mainValue()}
			<div class="text-sm">{displayURL}</div>
		{/snippet}
	</ModalValue>
{/if}
{#if provider.provider === SwapProvider.KONG_SWAP && KONGSWAP_PROVIDER_ENABLED}
	<SwapDetailsKong {provider} />
{:else if provider.provider === SwapProvider.ICP_SWAP}
	<SwapDetailsIcp {provider} {slippageValue} />
{:else if provider.provider === SwapProvider.VELORA}
	<SwapDetailsVelora {provider} />
{:else if provider.provider === SwapProvider.NEAR_INTENTS && NEAR_INTENTS_SWAP_ENABLED}
	<SwapDetailsNearIntents {provider} {slippageValue} />
{:else if provider.provider === SwapProvider.ONE_SEC && ONESEC_SWAP_ENABLED}
	<SwapDetailsOneSec {provider} />
{:else if provider.provider === SwapProvider.CHAIN_FUSION && CHAIN_FUSION_SWAP_ENABLED}
	<SwapDetailsChainFusion {provider} />
{:else if provider.provider === SwapProvider.OISY_TRADE && oisyTradeSwapEnabled}
	<SwapDetailsOisyTrade {provider} />
{:else if provider.provider === SwapProvider.LIFI && LIFI_SWAP_ENABLED}
	<SwapDetailsLifi {provider} />
{/if}
