<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { formatUSD } from '$lib/utils/format.utils';

	export let amount: number | undefined = undefined;
	export let exchangeRate: number | undefined = undefined;

	let usdValue: string | undefined;
	$: usdValue =
		nonNullish(amount) && nonNullish(exchangeRate)
			? formatUSD({
					value: amount * exchangeRate
				})
			: undefined;
</script>

{#if nonNullish(usdValue)}
	<div in:fade data-tid="convert-amount-exchange">
		{`${nonNullish(amount) && amount === 0 ? '' : '~'}`}{usdValue}
	</div>
{:else}
	<div class="w-10 sm:w-8" data-tid="convert-amount-exchange-skeleton">
		<SkeletonText />
	</div>
{/if}
