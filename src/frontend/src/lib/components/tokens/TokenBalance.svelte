<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

<output class="break-all">
	{formatToken({
		value: token.balance ?? BigNumber.from(0n),
		unitName: token.decimals
	})}
	{token.symbol}
</output>
