<script lang="ts">
	import type { BtcTransactionUi } from '$btc/types/btc';
	import { mapBtcTransactionToViewModel } from '$btc/utils/btc-transaction-row.utils';
	import TransactionRow from '$lib/components/transactions/TransactionRow.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import { createOpenTransactionModal } from '$lib/utils/transaction-modal.utils';

	interface Props {
		transaction: BtcTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { row, label } = $derived(
		mapBtcTransactionToViewModel({
			transaction,
			token,
			i18n: { send: $i18n.send.text.send, receive: $i18n.receive.text.receive }
		})
	);

	let onClick = $derived(
		createOpenTransactionModal({
			openModal: modalStore.openBtcTransaction,
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
