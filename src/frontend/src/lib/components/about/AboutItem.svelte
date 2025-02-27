<script lang="ts">
	export let asMenuItem = false;
	export let testId: string | undefined = undefined;
	export let asMenuItemCondensed = false;
</script>

<button
	class:text={asMenuItem}
	class:nav-item={asMenuItem}
	class:nav-item-condensed={asMenuItemCondensed}
	class:whitespace-nowrap={!asMenuItem}
	class:text-center={!asMenuItem}
	class:font-bold={!asMenuItem}
	class:text-brand-primary={!asMenuItem}
	on:click
	data-tid={testId}
>
	<div class="flex items-center gap-2">
		{#if asMenuItem}
			<slot name="icon" />
		{/if}
		<slot name="label"></slot>
	</div>
</button>
