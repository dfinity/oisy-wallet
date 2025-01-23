<script lang="ts">
	export let asMenuItem = false;
	export let testId: string | undefined = undefined;
</script>

<button
	class={asMenuItem ? 'text' : 'text-brand-primary text-center font-bold whitespace-nowrap'}
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
