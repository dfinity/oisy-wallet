<script lang="ts">
	import TransactionRow from '$lib/components/transactions/TransactionRow.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import { createOpenTransactionModal } from '$lib/utils/transaction-modal.utils';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import { mapSolTransactionToViewModel } from '$sol/utils/sol-transaction-row.utils';

	interface Props {
		transaction: SolTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { row, label } = $derived(
		mapSolTransactionToViewModel({
			transaction,
			token,
			i18n: { send: $i18n.send.text.send, receive: $i18n.receive.text.receive }
		})
	);

	let onClick = $derived(
		createOpenTransactionModal({
			openModal: modalStore.openSolTransaction,
			transaction,
			token
		})
	);
</script>

<TransactionRow
	{row}
	{iconType}
	{onClick}
>
	{label}
</TransactionRow>
