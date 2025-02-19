<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let token: Token;
</script>

<Value ref="network">
	<svelte:fragment slot="label">{$i18n.tokens.details.network}</svelte:fragment>
	<span class="flex items-center gap-1">
		<output>{token.network.name}</output>
		<Logo
			src={token.network.icon}
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.network.name })}
			color="white"
		/>
	</span>
</Value>

<Value ref="name">
	<svelte:fragment slot="label">{$i18n.tokens.details.token}</svelte:fragment>
	<span class="flex items-center gap-1">
		<output>{token.name}</output>
		<Logo
			src={token.icon}
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
			color="white"
		/>
	</span>
</Value>

<slot />

{#if ['icrc', 'erc20'].includes(token.standard)}
	<Value ref="symbol">
		<svelte:fragment slot="label">{$i18n.tokens.details.standard}</svelte:fragment>
		<output class="inline-block first-letter:capitalize">{token.standard}</output>
	</Value>
{/if}

<Value ref="symbol">
	<svelte:fragment slot="label">{$i18n.core.text.symbol}</svelte:fragment>
	<output>{token.symbol}</output>
</Value>

<Value ref="decimals">
	<svelte:fragment slot="label">{$i18n.core.text.decimals}</svelte:fragment>
	<output>{token.decimals}</output>
</Value>
