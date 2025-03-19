<script lang="ts">
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	export let selectable = false;
	export let selected = false;
</script>

<div class="border-b-1 flex w-full items-center border-brand-subtle-20 last-of-type:border-b-0">
	{#if selectable}
		<button class="flex w-full flex-1 flex-row py-1.5 text-left" on:click>
			<span class="grow-1 flex flex-row"><slot name="key" /></span>
			<span class="flex grow-0 pt-0.5 text-brand-primary">
				{#if selected}<IconCheck size="20" />{/if}
			</span>
		</button>
	{:else}
		<div class="flex w-full flex-1 flex-row py-0.5 text-left">
			<span class="flex w-full flex-row pt-1"><slot name="key" /></span>
			<span class="pt-1"><slot name="value" /></span>
		</div>
	{/if}
</div>
