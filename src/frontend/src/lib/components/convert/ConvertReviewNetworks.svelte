<script lang="ts">
	import { getContext } from 'svelte';
	import ConvertNetwork from '$lib/components/convert/ConvertNetwork.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<ConvertNetwork token={$sourceToken}>
	<svelte:fragment slot="label">{$i18n.convert.text.source_network}</svelte:fragment
	></ConvertNetwork
>

<ConvertNetwork token={$destinationToken}>
	<svelte:fragment slot="label">{$i18n.convert.text.destination_network}</svelte:fragment
	></ConvertNetwork
>
