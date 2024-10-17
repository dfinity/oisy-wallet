<script lang="ts">
	export let asMenuItem = false;
	export let testId: string | undefined = undefined;
</script>

<button
	class={asMenuItem ? 'text' : 'text-primary whitespace-nowrap text-center font-bold'}
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
