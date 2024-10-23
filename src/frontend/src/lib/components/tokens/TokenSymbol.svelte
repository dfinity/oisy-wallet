<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let token: Token;
</script>

<div class="flex flex-row items-center justify-between gap-2">
	{nonNullish(token.oisySymbol) ? token.oisySymbol.oisySymbol : token.symbol}

	{#if nonNullish(token.network.iconBW)}
		<Logo
			src={token.network.iconBW}
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.network.name })}
		/>
	{/if}
</div>
