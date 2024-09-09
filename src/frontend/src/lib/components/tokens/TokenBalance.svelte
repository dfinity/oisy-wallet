<script lang="ts">
	import { ZERO } from '$lib/constants/app.constants';
	import type { TokenUi } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	export let token: TokenUi;
</script>

<output class="break-all">
	{formatToken({
		value: token.balance ?? ZERO,
		unitName: token.decimals
	})}
	{token.symbol}
</output>
