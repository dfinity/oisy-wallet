<script lang="ts">
	import type { Snippet } from 'svelte';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import type { TransactionRowUi } from '$lib/types/transaction-row';

	interface Props {
		row: TransactionRowUi;
		children: Snippet;
		onClick: () => void;
		iconType?: 'token' | 'transaction';
		styleClass?: string;
		timeOnly?: boolean;
		testId?: string;
	}

	const {
		row,
		children,
		onClick,
		iconType = 'transaction',
		styleClass,
		timeOnly,
		testId
	}: Props = $props();
</script>

<Transaction
	approveSpender={row.approveSpender}
	displayAmount={row.displayAmount}
	from={row.from}
	{iconType}
	{onClick}
	status={row.status}
	{styleClass}
	timestamp={row.timestamp}
	to={row.to}
	token={row.token}
	tokenId={row.tokenId}
	{timeOnly}
	{testId}
	type={row.type}
>
	{@render children()}
</Transaction>
