<script lang="ts">
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { Utils } from 'alchemy-sdk';
	import { tokenSymbol } from '$lib/derived/token.derived';

	export let destination: string;
	export let amount: string | number | undefined = undefined;

	let amountDisplay: string;
	$: (() => {
		try {
			amountDisplay = formatEtherShort(Utils.parseEther(`${amount ?? 0}`), 8);
		} catch (err: unknown) {
			// Infinite amount e.g. 1.157920892373162e+59 will fail parsing
			amountDisplay = `${amount ?? 0}`;
		}
	})();
</script>

<label for="destination" class="font-bold px-1.25">Destination:</label>
<div id="destination" class="font-normal mb-2 px-1.25 break-words">{destination}</div>

<label for="amount" class="font-bold px-1.25">Amount:</label>
<div id="amount" class="font-normal px-1.25 mb-2 break-words">
	{amountDisplay}
	{$tokenSymbol}
</div>
