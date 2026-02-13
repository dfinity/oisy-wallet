<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isOnRamperDev } from '$env/rest/onramper.env';
	import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		{isOnRamperDev ? $i18n.buy.text.buy_dev : $i18n.buy.text.buy}
	{/snippet}

	<BuyModalContent />
</Modal>
