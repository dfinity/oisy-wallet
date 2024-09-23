<script lang="ts">
	import IconInfo from '$lib/components/icons/IconInfo.svelte';

	export let asMenuItem = false;
	export let testId: string | undefined = undefined;
</script>

<button
	class={asMenuItem ? 'text' : 'text-center text-primary font-bold whitespace-nowrap'}
	on:click
	data-tid={testId}
>
	<div class="flex gap-2 items-center">
		{#if asMenuItem}
			<IconInfo />
		{/if}
		<slot name="label"></slot>
	</div>
</button>
