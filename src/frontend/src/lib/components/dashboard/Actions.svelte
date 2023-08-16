<script>
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import Send from '$lib/components/actions/Send.svelte';
</script>

<div role="toolbar" class="flex gap-2 text-deep-violet font-bold pt-8">
	<button class="flex-1 secondary">
		<IconReceive size="28" />
		<span>Receive</span></button
	>

	<Send />
</div>
