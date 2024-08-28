<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { Token } from '$lib/types/token';
	import { ZERO } from '$lib/constants/utils.constants';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

<output class="break-all">
	{formatToken({
		value: token.balance ?? ZERO,
		unitName: token.decimals
	})}
	{token.symbol}
</output>
