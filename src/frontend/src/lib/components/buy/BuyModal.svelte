<script lang="ts">
	import BuyModalContent from '$lib/components/buy/BuyModalContent.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		{$i18n.buy.text.buy}
	{/snippet}

	<BuyModalContent />
</Modal>
