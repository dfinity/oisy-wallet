<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { balance, balanceZero } from '$lib/derived/balances.derived';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import { erc20TokensInitialized } from '$eth/derived/erc20.derived';
	import Amount from '$lib/components/ui/Amount.svelte';
</script>

<span class="text-off-white">
	<output
		class={`break-all font-bold ${
			($balance?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'
		}`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{#if nonNullish($balance) && !$balanceZero}
			<Amount amount={$balance} />
		{:else}
			0
		{/if}
	</output>
	{#if $erc20TokensInitialized}
		<span class="opacity-100">{$tokenSymbol}</span>
	{/if}
</span>
