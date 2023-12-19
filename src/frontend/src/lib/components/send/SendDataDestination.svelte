<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import type { Token } from '$lib/types/token';
	import { parseToken } from '$lib/utils/parse.utils';
	import { nonNullish } from '@dfinity/utils';
	import { TargetNetwork } from '$lib/enums/network';
	import Value from '$lib/components/ui/Value.svelte';

	export let destination: string;
	export let amount: string | number | undefined = undefined;
	export let token: Token;
	export let network: TargetNetwork | undefined;

	let amountDisplay: string;
	$: (() => {
		try {
			amountDisplay = formatTokenShort({
				value: parseToken({
					value: `${amount ?? 0}`,
					unitName: token.decimals
				}),
				unitName: token.decimals
			});
		} catch (err: unknown) {
			// Infinite amount e.g. 1.157920892373162e+59 will fail parsing
			amountDisplay = `${amount ?? 0}`;
		}
	})();
</script>

<Value ref="destination" element="div">
	<svelte:fragment slot="label">Destination</svelte:fragment>
	{destination}
</Value>

{#if nonNullish(network)}
	<Value ref="network" element="div">
		<svelte:fragment slot="label">Network</svelte:fragment>
		{#if network === TargetNetwork.ICP}
			Convert to native ICP
		{:else}
			Ethereum
		{/if}
	</Value>
{/if}

<Value ref="amount" element="div">
	<svelte:fragment slot="label">Amount</svelte:fragment>
	{amountDisplay}
	{$tokenSymbol}
</Value>
