<script lang="ts">
	import IconInfo from '$lib/components/icons/IconInfo.svelte';

	export let asMenuItem = false;
</script>

<button class={asMenuItem ? 'text' : 'text-center text-white font-bold whitespace-nowrap'} on:click>
	<div class="flex gap-2 items-center">
		{#if asMenuItem}
			<IconInfo />
		{/if}
		<slot name="label"></slot>
	</div>
</button>
