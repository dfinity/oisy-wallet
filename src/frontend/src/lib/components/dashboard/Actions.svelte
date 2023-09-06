<script lang="ts">
	import Send from '$lib/components/send/Send.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
</script>

<div role="toolbar" class="flex gap-2 text-deep-violet font-bold py-4">
	<Receive />

	<Send />
</div>
