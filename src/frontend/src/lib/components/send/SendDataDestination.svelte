<script lang="ts">
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let destination: string;
</script>

<Value ref="destination" element="div">
	<svelte:fragment slot="label">{$i18n.send.text.destination}</svelte:fragment>
	{destination}
</Value>
