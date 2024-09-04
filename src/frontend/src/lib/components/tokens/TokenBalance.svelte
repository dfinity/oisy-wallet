<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils';
	import type { TokenUi } from '$lib/types/token';
	import { ZERO } from '$lib/constants/app.constants';

	export let token: TokenUi;
</script>

<output class="break-all">
	{formatToken({
		value: token.balance ?? ZERO,
		unitName: token.decimals
	})}
	{token.symbol}
</output>
