<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		CONVERT_AMOUNT_DISPLAY_SKELETON,
		CONVERT_AMOUNT_DISPLAY_VALUE
	} from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		amount?: OptionAmount;
		symbol: string;
		exchangeRate?: number;
		displayExchangeRate?: boolean;
		zeroAmountLabel?: string;
		label?: Snippet;
	}

	let {
		amount,
		symbol,
		exchangeRate,
		displayExchangeRate = true,
		zeroAmountLabel,
		label
	}: Props = $props();
</script>

<ModalValue {label}>
	{#snippet mainValue()}
		{#if nonNullish(amount)}
			<div data-tid={CONVERT_AMOUNT_DISPLAY_VALUE} in:fade>
				{nonNullish(amount) && Number(amount) === 0 && nonNullish(zeroAmountLabel)
					? zeroAmountLabel
					: `${amount} ${symbol}`}
			</div>
		{:else}
			<div class="w-14 sm:w-24" data-tid={CONVERT_AMOUNT_DISPLAY_SKELETON}>
				<SkeletonText />
			</div>
		{/if}
	{/snippet}

	{#snippet secondaryValue()}
		{#if displayExchangeRate}
			<ConvertAmountExchange {amount} {exchangeRate} />
		{/if}
	{/snippet}
</ModalValue>
