<script lang="ts">
	import { balanceStore, balanceStoreZero } from '$lib/stores/balance.store';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { CURRENCY_SYMBOL } from '$lib/constants/eth.constants';
	import { nonNullish } from '@dfinity/utils';
</script>

<span class="text-ghost-white mt">
	<output
		class={`break-words ${($balanceStore?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'}`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{nonNullish($balanceStore) && !$balanceStoreZero ? formatEtherShort($balanceStore) : '0'}
	</output>
	<span class="opacity-100">{CURRENCY_SYMBOL}</span>
</span>
