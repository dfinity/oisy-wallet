<script lang="ts">
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let destination: string;
</script>

<Value ref="destination" element="div">
	{#snippet label()}
		{$i18n.send.text.destination}
	{/snippet}

	{#snippet content()}
		{destination}
	{/snippet}
</Value>
