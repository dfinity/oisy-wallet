<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';

	interface Props {
		feeAmount?: bigint;
		decimals: number;
		exchangeRate?: number;
	}

	let { feeAmount, decimals, exchangeRate }: Props = $props();

	let formattedAmount = $derived(
		nonNullish(feeAmount)
			? formatTokenBigintToNumber({
					value: feeAmount,
					unitName: decimals,
					displayDecimals: decimals
				})
			: undefined
	);
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.fee.text.total_fee}
	{/snippet}

	{#snippet mainValue()}
		<ConvertAmountExchange amount={formattedAmount} {exchangeRate} />
	{/snippet}
</ModalValue>
