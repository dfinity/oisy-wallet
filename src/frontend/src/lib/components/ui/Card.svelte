<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	export let noMargin = false;

	let description = false;
	$: description = nonNullish($$slots.description);

	let amount = true;
	$: amount = nonNullish($$slots.amount);
</script>

<div class="flex items-center gap-4" class:mb-6={!noMargin}>
	<slot name="icon" />

	<div class="flex-1 flex flex-col justify-center">
		<div class="flex font-bold gap-1" class:items-center={!description}>
			<span
				class="clamp-4 inline-flex items-center text-left"
				style={amount ? 'max-width: 60%' : undefined}><slot /></span
			>

			{#if amount}
				<span class="flex-1 text-right inline-flex justify-end items-center"
					><slot name="amount" /></span
				>
			{/if}
		</div>
		<p class="text-misty-rose text-left inline-flex items-center">
			<slot name="description" />
		</p>
	</div>
	<slot name="action" />
</div>
