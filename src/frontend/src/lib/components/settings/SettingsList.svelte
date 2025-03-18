<script lang="ts">
	const SLOTS = $$props.$$slots;
</script>

{#if SLOTS.title}
	<div class="flex w-full flex-row justify-between">
		<h5 class="mb-4 flex"><slot name="title" /></h5>
		<div><slot name="title-action" /></div>
	</div>
{/if}

<div class="mb-8 flex flex-col px-1">
	<slot />
</div>
