<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SwapLiquidityFees from '$lib/components/swap/SwapLiquidityFees.svelte';
	import SwapNetworkFee from '$lib/components/swap/SwapNetworkFee.svelte';
	import SwapRoute from '$lib/components/swap/SwapRoute.svelte';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';

	const { provider } = $props<{
		provider: Extract<SwapMappedResult, { provider: SwapProvider.KONG_SWAP }>;
	}>();
</script>

{#if nonNullish(provider.route) && provider.route?.length > 0}
	<SwapRoute route={provider.route} />
{/if}

{#if provider.networkFee}
	<SwapNetworkFee networkFee={provider.networkFee} />
{/if}

{#if nonNullish(provider.liquidityFees) && provider.liquidityFees?.length > 0}
	<SwapLiquidityFees liquidityFees={provider.liquidityFees} />
{/if}
