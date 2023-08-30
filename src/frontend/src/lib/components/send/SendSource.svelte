<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { balance } from '$lib/derived/balances.derived';
	import { tokenSymbol } from '$lib/derived/token.derived';
</script>

<label for="source" class="font-bold px-1.25">Source:</label>
<div id="source" class="font-normal mb-2 px-1.25 break-words">{$addressStore ?? ''}</div>

<label for="balance" class="font-bold px-1.25">Balance:</label>
<div id="balance" class="font-normal px-1.25 mb-2 break-words">
	{formatEtherShort($balance ?? BigNumber.from(0n))}
	{$tokenSymbol}
</div>
