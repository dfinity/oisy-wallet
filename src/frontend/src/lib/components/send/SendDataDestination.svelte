<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		destination: string;
	}

	let { destination }: Props = $props();
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.send.text.destination}
	{/snippet}

	{#snippet mainValue()}
		{shortenWithMiddleEllipsis({ text: destination })}
	{/snippet}
</ModalValue>
