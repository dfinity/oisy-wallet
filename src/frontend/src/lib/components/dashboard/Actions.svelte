<script lang="ts">
	import Send from '$lib/components/send/Send.svelte';
	import Receive from '$lib/components/receive/Receive.svelte';
	import TopUp from '$lib/components/receive-mm/ReceiveMM.svelte';
</script>

<div role="toolbar" class="flex gap-2 text-deep-violet font-bold pt-8">
	<Receive />
	<Send />
	<TopUp/>
</div>
