<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
	export let hideNetworkLogo = false;
</script>

<div class="flex flex-row items-center justify-between gap-2">
	{nonNullish(data.oisySymbol) ? data.oisySymbol.oisySymbol : data.symbol}

	{#if nonNullish(data.network.iconLight) && nonNullish(data.network.iconDark) && !hideNetworkLogo}
		<NetworkLogo network={data.network} blackAndWhite />
	{/if}
</div>
