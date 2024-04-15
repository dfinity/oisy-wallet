<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	export let pending = false;

	let description = false;
	$: description = nonNullish($$slots.description);

	let amount = true;
	$: amount = nonNullish($$slots.amount);
</script>

<div class="flex items-center gap-4 mb-6">
	<slot name="icon" />

	<div class="flex-1 flex flex-col justify-center">
		<div class="flex font-bold gap-1" class:items-center={!description}>
			<span class="clamp-4" style={amount ? 'max-width: 60%' : undefined}><slot /></span>

			{#if amount}
				<span class="flex-1 text-right"><slot name="amount" /></span>
			{/if}
		</div>
		<p class="text-misty-rose text-left" class:text-goldenrod={pending}>
			<slot name="description" />

			{#if pending}
				Pending...
			{/if}
		</p>
	</div>
	<slot name="action" />
</div>
