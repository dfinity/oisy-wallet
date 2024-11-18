<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import ConvertValue from '$lib/components/convert/ConvertValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { OptionAmount } from '$lib/types/send';

	export let amount: OptionAmount = undefined;
	export let symbol: string;
	export let exchangeRate: number | undefined = undefined;
	export let zeroAmountLabel: string | undefined = undefined;
</script>

<ConvertValue>
	<slot name="label" slot="label" />

	<svelte:fragment slot="main-value">
		{#if nonNullish(amount)}
			<div in:fade data-tid="convert-amount-display-value">
				{nonNullish(amount) && amount === 0 && nonNullish(zeroAmountLabel)
					? zeroAmountLabel
					: `${amount} ${symbol}`}
			</div>
		{:else}
			<div class="w-14 sm:w-24" data-tid="convert-amount-display-skeleton">
				<SkeletonText />
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="secondary-value">
		<ConvertAmountExchange {amount} {exchangeRate} />
	</svelte:fragment>
</ConvertValue>
