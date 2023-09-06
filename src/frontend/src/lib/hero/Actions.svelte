<script lang="ts">
	import Send from '$lib/components/send/Send.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';

	export let send = false;
</script>

<div role="toolbar" class="flex gap-2 text-deep-violet font-bold py-4">
	<Receive />

	{#if send}
		<Send />
	{/if}
</div>
