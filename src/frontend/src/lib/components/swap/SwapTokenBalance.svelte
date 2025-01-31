<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import type { IcToken } from '$icp/types/ic-token';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { formatToken } from '$lib/utils/format.utils';

	export let token: IcToken;
	export let balance: BigNumber | undefined = undefined;
</script>

<div class="flex items-center">
	<IconWallet size="14" />

	<div class="ml-1 font-semibold">
		{formatToken({
			value: balance ?? ZERO,
			unitName: token.decimals
		})}
		{token.symbol}
	</div>
</div>
