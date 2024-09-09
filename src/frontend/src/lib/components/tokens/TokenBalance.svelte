<script lang="ts">
	import SkeletonTokenBalance from '$lib/components/tokens/SkeletonTokenBalance.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import type { TokenUi } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	export let token: TokenUi;
</script>

<SkeletonTokenBalance {token}>
	<output class="break-all">
		{formatToken({
			value: token.balance ?? ZERO,
			unitName: token.decimals
		})}
		{token.symbol}
	</output>
</SkeletonTokenBalance>
