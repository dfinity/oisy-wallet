<script lang="ts">
	import { balancesStore } from '$lib/stores/balances.store';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { CURRENCY_SYMBOL } from '$lib/constants/eth.constants';
	import { nonNullish } from '@dfinity/utils';
	import {balanceZero} from "$lib/derived/balances.derived";
</script>

<span class="text-ghost-white mt">
	<output
		class={`break-words ${($balancesStore?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'}`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{nonNullish($balancesStore) && !$balanceZero ? formatEtherShort($balancesStore) : '0'}
	</output>
	<span class="opacity-100">{CURRENCY_SYMBOL}</span>
</span>
