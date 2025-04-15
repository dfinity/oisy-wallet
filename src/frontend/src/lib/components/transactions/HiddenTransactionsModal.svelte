<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { modalStore } from '$lib/stores/modal.store.js';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl">{$i18n.transactions.text.hidden_transactions_title}</span>
	</svelte:fragment>

	<MessageBox level="info" closableKey="oisy_hide_hidden_transactions">
		{replaceOisyPlaceholders($i18n.transactions.text.hidden_transactions_info)}
	</MessageBox>

	<AllTransactionsList onlyMicroTransactions />
</Modal>
