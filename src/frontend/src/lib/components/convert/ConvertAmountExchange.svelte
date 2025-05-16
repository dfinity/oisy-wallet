<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		CONVERT_AMOUNT_EXCHANGE_SKELETON,
		CONVERT_AMOUNT_EXCHANGE_VALUE
	} from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';
	import { formatUSD } from '$lib/utils/format.utils';

	export let amount: OptionAmount = undefined;
	export let exchangeRate: number | undefined = undefined;

	let usdValue: string | undefined;
	$: usdValue =
		nonNullish(amount) && nonNullish(exchangeRate)
			? formatUSD({
					value: Number(amount) * exchangeRate
				})
			: undefined;
</script>

{#if nonNullish(usdValue)}
	<div in:fade data-tid={CONVERT_AMOUNT_EXCHANGE_VALUE}>
		{`${nonNullish(amount) && amount === 0 ? '' : '~'}`}{usdValue}
	</div>
{:else if isNullish(amount)}
	<div in:fade class="w-10 sm:w-8" data-tid={CONVERT_AMOUNT_EXCHANGE_SKELETON}>
		<SkeletonText />
	</div>
{/if}
