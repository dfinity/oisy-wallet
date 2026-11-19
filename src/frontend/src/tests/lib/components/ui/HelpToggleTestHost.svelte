<script lang="ts">
	import HelpToggle from '$lib/components/ui/HelpToggle.svelte';

	let expanded = $state(false);
</script>

<HelpToggle styleClass="text-tertiary" bind:expanded />
<span data-tid="help-toggle-expanded">{String(expanded)}</span>
