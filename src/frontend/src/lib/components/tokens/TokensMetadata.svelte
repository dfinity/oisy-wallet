<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { KeyValuePairInfo } from '@dfinity/gix-components';
	import { tokens } from '$lib/derived/tokens.derived';
</script>

<div class="mt-4 mb-2">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"><span class="font-bold">Tokens:</span></svelte:fragment>

		<svelte:fragment slot="info">
			The list of tokens currently supported by Oisy Wallet.
		</svelte:fragment>
	</KeyValuePairInfo>
</div>

{#each $tokens as token, i}
	{@const last = i === $tokens.length - 1}

	<div
		class="flex gap-1"
		style={`border-left: 1px solid var(--color-platinum); border-top: 1px solid var(--color-platinum); border-right: 1px solid var(--color-platinum); ${
			last ? 'border-bottom: 1px solid var(--color-platinum);' : ''
		}`}
		class:rounded-tl-sm={i === 0}
		class:rounded-tr-sm={i === 0}
		class:rounded-bl-sm={last}
		class:rounded-br-sm={last}
	>
		<div class="flex items-center justify-center pl-2 pr-1">
			<Logo src={token.icon} alt={`${token.name} logo`} size="32" color="white" />
		</div>

		<div class="py-4">
			<p><strong>{token.name}</strong> <small>({token.symbol})</small></p>

			<span class="break-all py-4">
				<small>Decimals: {token.decimals}</small>
			</span>
		</div>
	</div>
{/each}
