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
	<svelte:fragment slot="label">
		{$i18n.send.text.destination}
	</svelte:fragment>

	<svelte:fragment slot="main-value">
		{shortenWithMiddleEllipsis({ text: destination })}
	</svelte:fragment>
</ModalValue>
