<script lang="ts">
	import IconInfo from '$lib/components/icons/IconInfo.svelte';

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
			<slot name="icon">
				<IconInfo />
			</slot>
		{/if}
		<slot name="label"></slot>
	</div>
</button>
