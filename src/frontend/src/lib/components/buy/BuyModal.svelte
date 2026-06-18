<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isOnRamperDev } from '$env/rest/onramper.env';
	import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	// DEMO BRANCH — NOT FOR MERGE: `signed` is forwarded to the widget to pick signed vs unsigned URL.
	let { signed = false }: { signed?: boolean } = $props();
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		{isOnRamperDev ? $i18n.buy.text.buy_dev : $i18n.buy.text.buy}{signed ? ' — signed' : ''}
	{/snippet}

	<BuyModalContent {signed} />
</Modal>
