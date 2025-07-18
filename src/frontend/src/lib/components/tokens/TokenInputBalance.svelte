<script lang="ts">
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import type { Balance } from '$lib/types/balance';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		balance?: Balance;
		testId?: string;
	}

	let { token, balance, testId }: Props = $props();
</script>

<div class="flex items-center" data-tid={testId}>
	<IconWallet size="14" />

	<div class="ml-1 font-semibold">
		{formatToken({
			value: balance ?? ZERO,
			unitName: token.decimals
		})}
		{getTokenDisplaySymbol(token)}
	</div>
</div>
