<script lang="ts">
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { Utils } from 'alchemy-sdk';
	import { tokenSymbol } from '$lib/derived/token.derived';

	export let destination: string;
	export let amount: number | undefined = undefined;
</script>

<label for="destination" class="font-bold px-1.25">Destination:</label>
<div id="destination" class="font-normal mb-2 px-1.25 break-words">{destination}</div>

<label for="amount" class="font-bold px-1.25">Amount:</label>
<div id="amount" class="font-normal px-1.25 mb-2 break-words">
	{formatEtherShort(Utils.parseEther(`${amount ?? 0}`), 8)}
	{$tokenSymbol}
</div>
