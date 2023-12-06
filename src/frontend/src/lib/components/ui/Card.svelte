<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	export let pending = false;

	let description = false;
	$: description = nonNullish($$slots.description);
</script>

<div class="flex gap-4 mb-6">
	<slot name="icon" />

	<div class="flex-1 flex flex-col justify-center">
		<div class="flex font-bold gap-1" class:items-center={!description}>
			<span class="clamp-4" style="max-width: 60%"><slot /></span>
			<span class="flex-1 text-right"><slot name="amount" /></span>
		</div>
		<p class="text-misty-rose text-left" class:text-goldenrod={pending}>
			<slot name="description" />

			{#if pending}
				Pending...
			{/if}
		</p>
	</div>
</div>
