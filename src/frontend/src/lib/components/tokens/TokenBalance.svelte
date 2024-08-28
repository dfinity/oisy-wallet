<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { Token } from '$lib/types/token';
	import { ZERO } from '$lib/constants/utils.constants';

	export let token: Token;
</script>

<output class="break-all">
	{formatToken({
		value: $balancesStore?.[token.id]?.data ?? ZERO,
		unitName: token.decimals
	})}
	{token.symbol}
</output>
