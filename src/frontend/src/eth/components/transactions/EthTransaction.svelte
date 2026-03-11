<script lang="ts">
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { mapEthTransactionToViewModel } from '$eth/utils/eth-transaction-row.utils';
	import TransactionRow from '$lib/components/transactions/TransactionRow.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import { createOpenTransactionModal } from '$lib/utils/transaction-modal.utils';

	interface Props {
		transaction: EthTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { row, label } = $derived(
		mapEthTransactionToViewModel({
			transaction,
			token,
			ercFungibleTokens: $ercFungibleTokens,
			i18n: {
				send: $i18n.send.text.send,
				receive: $i18n.receive.text.receive,
				sendToken: $i18n.send.text.send_token,
				approveLabel: $i18n.transaction.text.approve_label,
				unlimited: $i18n.core.text.unlimited,
				convertingCkToken: $i18n.transaction.label.converting_ck_token,
				ckTokenConverted: $i18n.transaction.label.ck_token_converted,
				convertingTwinToken: $i18n.transaction.label.converting_twin_token
			}
		})
	);

	let onClick = $derived(
		createOpenTransactionModal({
			openModal: modalStore.openEthTransaction,
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
