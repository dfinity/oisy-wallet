<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconOisyMenu from '$lib/components/icons/IconOisyMenu.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';

	const dispatch = createEventDispatcher();

	const openReceive = () => {
		dispatch('icReceiveTriggered');
		emit({ message: 'oisyReceive' });
	};
</script>

<button on:click={openReceive} class="nav-item nav-item-condensed">
	<IconOisyMenu size="20" />
	{$i18n.wallet.text.your_addresses}
</button>
