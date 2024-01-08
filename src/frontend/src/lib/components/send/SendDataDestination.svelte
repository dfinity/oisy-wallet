<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import type { Token } from '$lib/types/token';
	import { parseToken } from '$lib/utils/parse.utils';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import type { Network } from '$lib/types/network';
	import { isNetworkICP } from '$lib/utils/network.utils';

	export let destination: string;
	export let amount: string | number | undefined = undefined;
	export let token: Token;

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

<slot />

<Value ref="amount" element="div">
	<svelte:fragment slot="label">Amount</svelte:fragment>
	{amountDisplay}
	{$tokenSymbol}
</Value>
