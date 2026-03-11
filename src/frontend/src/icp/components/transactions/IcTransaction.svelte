<script lang="ts">
	import IcTransactionLabel from '$icp/components/transactions/IcTransactionLabel.svelte';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { mapIcTransactionToViewModel } from '$icp/utils/ic-transaction-row.utils';
	import TransactionRow from '$lib/components/transactions/TransactionRow.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import { createOpenTransactionModal } from '$lib/utils/transaction-modal.utils';

	interface Props {
		transaction: IcTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { row, label } = $derived(mapIcTransactionToViewModel({ transaction, token }));

	let onClick = $derived(
		createOpenTransactionModal({
			openModal: modalStore.openIcTransaction,
			transaction,
			token
		})
	);
</script>

<TransactionRow
	{row}
	{iconType}
	{onClick}
	styleClass="block w-full border-0"
>
	<IcTransactionLabel amount={label.amount} label={label.label} {token} type={label.type} />
</TransactionRow>
