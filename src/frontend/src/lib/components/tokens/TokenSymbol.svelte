<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
	export let hideNetworkLogo = false;
</script>

<div class="gap-2 flex flex-row items-center justify-between">
	{nonNullish(data.oisySymbol) ? data.oisySymbol.oisySymbol : data.symbol}

	{#if nonNullish(data.network.iconBW) && !hideNetworkLogo}
		<NetworkLogo network={data.network} blackAndWhite />
	{/if}
</div>
