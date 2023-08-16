<script lang="ts">
	import Send from '$lib/components/actions/Send.svelte';
	import Receive from "$lib/components/actions/Receive.svelte";
</script>

<div role="toolbar" class="flex gap-2 text-deep-violet font-bold pt-8">
	<Receive />

	<Send />
</div>
