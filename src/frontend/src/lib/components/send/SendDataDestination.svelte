<script lang="ts">
	import Value from '$lib/components/ui/Value.svelte';

	export let destination: string;
</script>

<Value ref="destination" element="div">
	<svelte:fragment slot="label">Destination</svelte:fragment>
	{destination}
</Value>
