<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		transaction: SolTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
		// Whether the amount column shows this token's net change. On a token page it does; on the
		// unfiltered activity the row shows no amount at all, since one figure out of several would
		// misdescribe the transaction. The sentence is the same in both.
		showTokenAmount?: boolean;
	}

	let { transaction, token, iconType = 'transaction', showTokenAmount = false }: Props = $props();

	let { type, value, timestamp, status, to, from, toOwner, fromOwner, summary, netChanges } =
		$derived(transaction);

	let label = $derived(
		isNullish(summary)
			? type === 'send'
				? $i18n.send.text.send
				: $i18n.receive.text.receive
			: summary.kind === 'send'
				? $i18n.send.text.send
				: summary.kind === 'receive'
					? $i18n.receive.text.receive
					: summary.kind === 'swap'
						? $i18n.swap.text.swap
						: $i18n.transaction.text.kind_other
	);

	// The net change of the token whose page this is: the SOL entry for the native token, the
	// entry of this mint for an SPL token. Absent when the transaction did not move it.
	let tokenNetChange = $derived(
		netChanges?.find((change) =>
			isTokenSpl(token) ? change.tokenAddress === token.address : isSolNetBalanceChangeSol(change)
		)
	);

	// The single-sided move a summary reduces to. A swap moves two tokens, so it names no main
	// change and the unfiltered list shows no figure for it: either would misdescribe the other.
	let mainChange = $derived(
		summary?.kind === 'send'
			? summary.spent
			: summary?.kind === 'receive'
				? summary.received
				: undefined
	);

	// Records from before the redesign carry no summary and keep their old signed value.
	let fallbackAmount = $derived(
		nonNullish(value) ? (type === 'send' ? value * -1n : value) : undefined
	);

	let tokenMatchesMainChange = $derived(
		nonNullish(mainChange) &&
			(isTokenSpl(token)
				? mainChange.tokenAddress === token.address
				: isSolNetBalanceChangeSol(mainChange))
	);

	let displayAmount = $derived(
		showTokenAmount
			? (tokenNetChange?.delta ?? (isNullish(summary) ? fallbackAmount : undefined))
			: isNullish(summary)
				? fallbackAmount
				: tokenMatchesMainChange
					? mainChange?.delta
					: undefined
	);

	let pending = $derived(status === 'processed' || isNullish(status));

	let transactionStatus: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	const modalId = Symbol();
</script>

<Transaction
	{displayAmount}
	from={fromOwner ?? from}
	{iconType}
	onClick={() => modalStore.openSolTransaction({ id: modalId, data: { transaction, token } })}
	status={transactionStatus}
	timestamp={nonNullish(timestamp) ? Number(timestamp) : timestamp}
	to={toOwner ?? to}
	{token}
	{type}
>
	{label}
</Transaction>
