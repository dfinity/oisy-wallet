<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let data: CardData;
</script>

<div class="flex flex-row items-center justify-between gap-2">
	{nonNullish(data.oisySymbol) ? data.oisySymbol.oisySymbol : data.symbol}

	{#if nonNullish(data.network.iconBW)}
		<Logo
			src={data.network.iconBW}
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: data.network.name })}
		/>
	{/if}
</div>
