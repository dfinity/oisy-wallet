<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';

	export let noMargin = false;
	export let testId: string | undefined = undefined;

	let description = false;
	$: description = nonNullish($$slots.description);

	let amount = true;
	$: amount = nonNullish($$slots.amount);

	let action = true;
	$: action = nonNullish($$slots.action);
</script>

<div class="flex items-center gap-4" class:mb-6={!noMargin} data-tid={testId}>
	<slot name="icon" />

	<div class="flex flex-1 flex-col justify-center">
		<div class="flex gap-1 font-bold leading-5" class:items-center={!description}>
			<span
				class="clamp-4 inline-flex items-center text-left"
				style={amount ? 'max-width: 60%' : undefined}><slot /></span
			>

			{#if amount}
				<CardAmount><slot name="amount" /></CardAmount>
			{/if}
		</div>
		<span class="inline-flex items-center text-left text-misty-rose">
			<slot name="description" />
		</span>
	</div>
	{#if action}
		<div class="flex min-w-14 flex-shrink">
			<slot name="action" />
		</div>
	{/if}
</div>
