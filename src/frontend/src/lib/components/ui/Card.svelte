<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';

	export let noMargin = false;

	let description = false;
	$: description = nonNullish($$slots.description);

	let amount = true;
	$: amount = nonNullish($$slots.amount);
</script>

<div class="flex items-center gap-4" class:mb-6={!noMargin}>
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
		<p class="inline-flex items-center text-left text-misty-rose">
			<slot name="description" />
		</p>
	</div>
	<slot name="action" />
</div>
