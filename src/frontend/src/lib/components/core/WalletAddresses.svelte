<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';

	const dispatch = createEventDispatcher();

	const openReceive = () => {
		dispatch('icReceiveTriggered');
		emit({ message: 'oisyReceive' });
	};
</script>

<button on:click={openReceive} class="nav-item nav-item-condensed">
	<IconCopy />
	{$i18n.wallet.text.your_addresses}
</button>
