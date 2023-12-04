<script lang="ts">
	import Send from '$lib/components/send/Send.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';

	export let send = false;
</script>

<div role="toolbar" class="flex gap-4 text-deep-violet font-bold py-8">
	<Receive />

	{#if send}
		<Send />
	{/if}
</div>
