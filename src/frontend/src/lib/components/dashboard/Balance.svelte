<script lang="ts">
	import { BigNumber } from 'alchemy-sdk';
	import { balanceStore } from '$lib/stores/balance.store';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { CURRENCY_SYMBOL } from '$lib/constants/eth.constants';
</script>

<span class="text-ghost-white mt">
	<output
		class={`break-words ${($balanceStore?.toBigInt() ?? 0n) === 0n ? 'opacity-50' : 'opacity-100'}`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{formatEtherShort($balanceStore ?? BigNumber.from(0n))}
	</output>
	<span class="opacity-100">{CURRENCY_SYMBOL}</span>
</span>
