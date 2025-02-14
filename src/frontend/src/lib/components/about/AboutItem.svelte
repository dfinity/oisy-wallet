<script lang="ts">
	export let asMenuItem = false;
	export let testId: string | undefined = undefined;
	export let asMenuItemCondensed = false;
</script>

<button
	class={asMenuItem
		? `text nav-item ${asMenuItemCondensed ? 'nav-item-condensed' : ''}`
		: `font-bold text-center whitespace-nowrap text-brand-primary`}
	on:click
	data-tid={testId}
>
	<div class="gap-2 flex items-center">
		{#if asMenuItem}
			<slot name="icon" />
		{/if}
		<slot name="label"></slot>
	</div>
</button>
