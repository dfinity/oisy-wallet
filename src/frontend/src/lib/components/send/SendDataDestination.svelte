<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import type { Token } from '$lib/types/token';
	import { parseToken } from '$lib/utils/parse.utils';
	import { nonNullish } from '@dfinity/utils';
	import { TargetNetwork } from '$lib/enums/network';

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

<label for="destination" class="font-bold px-4.5">Destination:</label>
<div id="destination" class="font-normal mb-4 px-4.5 break-all">{destination}</div>

{#if nonNullish(network)}
	<label for="network" class="font-bold px-4.5">Network:</label>
	<div id="network" class="font-normal mb-4 px-4.5 break-all">
		{#if network === TargetNetwork.ICP}
			Convert to native ICP
		{:else}
			Ethereum
		{/if}
	</div>
{/if}

<label for="amount" class="font-bold px-4.5">Amount:</label>
<div id="amount" class="font-normal px-4.5 mb-4 break-all">
	{amountDisplay}
	{$tokenSymbol}
</div>
