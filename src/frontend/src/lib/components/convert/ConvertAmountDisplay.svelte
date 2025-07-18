<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		CONVERT_AMOUNT_DISPLAY_SKELETON,
		CONVERT_AMOUNT_DISPLAY_VALUE
	} from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';

	export let amount: OptionAmount = undefined;
	export let symbol: string;
	export let exchangeRate: number | undefined = undefined;
	export let displayExchangeRate = true;
	export let zeroAmountLabel: string | undefined = undefined;
</script>

<ModalValue>
	{#snippet label()}
		<slot name="label" />
	{/snippet}

	{#snippet mainValue()}
		{#if nonNullish(amount)}
			<div in:fade data-tid={CONVERT_AMOUNT_DISPLAY_VALUE}>
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
