<script lang="ts">
	export let asMenuItem = false;
	export let testId: string | undefined = undefined;
	export let styleClass = '';
</script>

<button
	class={asMenuItem ? `nav-item ${styleClass}` : `whitespace-nowrap text-center font-bold text-brand-primary ${styleClass}`}
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
