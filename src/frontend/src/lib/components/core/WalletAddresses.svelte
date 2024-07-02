<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const openReceive = () => {
		dispatch('icReceiveTriggered');
		emit({ message: 'oisyReceive' });
	};
</script>

<button on:click={openReceive} class="text gap-2">
	<IconCopy />
	{$i18n.wallet.text.your_addresses}
</button>
