<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let token: Token;
</script>

<Value ref="network">
	{#snippet label()}
		{$i18n.tokens.details.network}
	{/snippet}

	{#snippet content()}
		<span class="flex items-center gap-1">
			<output>{token.network.name}</output>
			<NetworkLogo network={token.network} />
		</span>
	{/snippet}
</Value>

<Value ref="name">
	{#snippet label()}
		{$i18n.tokens.details.token}
	{/snippet}

	{#snippet content()}
		<span class="flex items-center gap-1">
			<output>{token.name}</output>
			<Logo
				src={token.icon}
				alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
				color="white"
			/>
		</span>
	{/snippet}
</Value>

<slot />

{#if ['icrc', 'erc20'].includes(token.standard)}
	<Value ref="symbol">
		{#snippet label()}
			{$i18n.tokens.details.standard}
		{/snippet}

		{#snippet content()}
			<output class="inline-block first-letter:capitalize">{token.standard}</output>
		{/snippet}
	</Value>
{/if}

<Value ref="symbol">
	{#snippet label()}
		{$i18n.core.text.symbol}
	{/snippet}

	{#snippet content()}
		<output
			>{`${getTokenDisplaySymbol(token)}${nonNullish(token.oisySymbol) ? ` (${token.symbol})` : ''}`}</output
		>
	{/snippet}
</Value>

<Value ref="decimals">
	{#snippet label()}
		{$i18n.core.text.decimals}
	{/snippet}

	{#snippet content()}
		<output>{token.decimals}</output>
	{/snippet}
</Value>
