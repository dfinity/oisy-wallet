<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils.js';
	import { balancesStore } from '$lib/stores/balances.store.js';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<output class="break-all">
	{formatToken({
		value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0n),
		unitName: token.decimals
	})}
	{token.symbol}
</output>
