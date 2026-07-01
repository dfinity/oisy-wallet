<script lang="ts">
	import LiquidiumBorrowingCard from '$lib/components/liquidium/LiquidiumBorrowingCard.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { liquidiumPortfolio } from '$lib/derived/liquidium.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let borrowReserves = $derived(
		($liquidiumPortfolio?.reserves ?? []).filter(({ borrowed }) => borrowed > ZERO)
	);
</script>

<div class="flex flex-col gap-4">
	{#if borrowReserves.length === 0}
		<p class="py-10 text-center text-tertiary">{$i18n.borrowings.text.no_borrowings}</p>
	{:else}
		{#each borrowReserves as reserve (reserve.poolId)}
			<LiquidiumBorrowingCard {reserve} variant="holdings" />
		{/each}
	{/if}
</div>
