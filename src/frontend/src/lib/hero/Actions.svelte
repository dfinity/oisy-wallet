<script lang="ts">
	import Send from '$lib/components/send/Send.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import Burn from '$lib/components/burn/Burn.svelte';

	export let send = false;
	export let burn = false;
</script>

<div role="toolbar" class="flex gap-2 text-deep-violet font-bold py-4" style="flex-wrap: wrap;">
	<Receive />

	{#if send}
		<Send />
	{/if}

	{#if burn}
		<Burn />
	{/if}
</div>
