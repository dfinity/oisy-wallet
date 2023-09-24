<script lang="ts">
	import { formatTokenShort } from '$lib/utils/format.utils';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import type { Token } from '$lib/types/token';
	import { parseToken } from '$lib/utils/parse.utils';
	import { nonNullish } from '@dfinity/utils';
	import type { TargetNetwork } from '$lib/enums/network';

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
				unitName: token.decimals,
				displayDecimals: 8
			});
		} catch (err: unknown) {
			// Infinite amount e.g. 1.157920892373162e+59 will fail parsing
			amountDisplay = `${amount ?? 0}`;
		}
	})();
</script>

<label for="destination" class="font-bold px-1.25">Destination:</label>
<div id="destination" class="font-normal mb-2 px-1.25 break-words">{destination}</div>

{#if nonNullish(network)}
	<label for="network" class="font-bold px-1.25">Network:</label>
	<div id="network" class="font-normal mb-2 px-1.25 break-words">{network}</div>
{/if}

<label for="amount" class="font-bold px-1.25">Amount:</label>
<div id="amount" class="font-normal px-1.25 mb-2 break-words">
	{amountDisplay}
	{$tokenSymbol}
</div>
