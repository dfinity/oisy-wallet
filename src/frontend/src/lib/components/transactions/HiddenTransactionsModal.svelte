<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { modalStore } from '$lib/stores/modal.store.js';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';
	import {HIDDEN_TRANSACTIONS_INFO_BOX} from "$lib/constants/test-ids.constants";
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl">{$i18n.transactions.text.hidden_transactions_title}</span>
	</svelte:fragment>

	<MessageBox level="info" closableKey="oisy_hide_hidden_transactions" testId={HIDDEN_TRANSACTIONS_INFO_BOX}>
		{replaceOisyPlaceholders($i18n.transactions.text.hidden_transactions_info)}
	</MessageBox>

	<AllTransactionsList onlyMicroTransactions />
</Modal>
