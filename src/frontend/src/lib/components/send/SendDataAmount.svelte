<script lang="ts">
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let amount: OptionAmount = undefined;
	export let token: Token;

	let amountDisplay: string;
	$: (() => {
		try {
			amountDisplay = formatToken({
				value: parseToken({
					value: `${amount ?? 0}`,
					unitName: token.decimals
				}),
				unitName: token.decimals,
				displayDecimals: token.decimals
			});
		} catch (err: unknown) {
			// Infinite amount e.g. 1.157920892373162e+59 will fail parsing
			amountDisplay = `${amount ?? 0}`;
		}
	})();
</script>

<Value ref="amount" element="div">
	<svelte:fragment slot="label">{$i18n.core.text.amount}</svelte:fragment>
	{amountDisplay}
	{token.symbol}
</Value>
