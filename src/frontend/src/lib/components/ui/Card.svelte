<script lang="ts">
	import Hr from '$lib/components/ui/Hr.svelte';

	export let pending = false;
</script>

<div class="flex gap-2 mb-2">
	<slot name="icon" />

	<div class="flex-1 flex flex-col justify-center">
		<div class="flex font-bold">
			<span><slot /></span>
			<span class="flex-1 text-right"><slot name="amount" /></span>
		</div>
		<p class="text-dark" class:text-goldenrod={pending} class:opacity-50={!pending}>
			<slot name="description" />

			{#if pending}
				Pending...
			{/if}
		</p>
	</div>
</div>

<Hr />
