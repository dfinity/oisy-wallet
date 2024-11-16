<script lang="ts">
	import { slide } from 'svelte/transition';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import type { AllTransactionsUi } from '$lib/types/transaction';

	export let date: string;
	export let transactions: AllTransactionsUi;
</script>

{#if transactions.length > 0}
	<div class="mb-5 flex flex-col gap-4">
		<span class="text-lg font-medium text-tertiary first-letter:capitalize">{date}</span>

		{#each transactions as transaction, index (`${transaction.id}-${index}`)}
			{@const { component, token } = transaction}

			<div in:slide={SLIDE_DURATION}>
				<svelte:component this={component} {transaction} {token} />
			</div>
		{/each}
	</div>
{/if}
