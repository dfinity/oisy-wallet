<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import type { SolNetBalanceChange } from '$sol/types/sol-transaction-summary';
	import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
	import { formatSolTransactionSummary } from '$sol/utils/sol-transaction-summary.utils';
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

	const symbolOf = (tokenAddress: string | undefined): string => {
		if (isNullish(tokenAddress)) {
			return SOLANA_TOKEN.symbol;
		}

		return (
			$enabledSplTokens.find(
				({ address, network: { id } }) => address === tokenAddress && id === token.network.id
			)?.symbol ?? $i18n.transaction.text.unknown_token
		);
	};

	const decimalsOf = (change: SolNetBalanceChange): number =>
		change.decimals ?? (isSolNetBalanceChangeSol(change) ? 9 : token.decimals);

	// Records written before the summary existed fall back to the old two-word label.
	let label = $derived(
		nonNullish(summary)
			? formatSolTransactionSummary({ summary, i18n: $i18n, symbolOf, decimalsOf })
			: type === 'send'
				? $i18n.send.text.send
				: $i18n.receive.text.receive
	);

	// The net change of the token whose page this is: the SOL entry for the native token, the
	// entry of this mint for an SPL token. Absent when the transaction did not move it.
	let tokenNetChange = $derived(
		netChanges?.find((change) =>
			isTokenSpl(token) ? change.tokenAddress === token.address : isSolNetBalanceChangeSol(change)
		)
	);

	let displayAmount = $derived(
		showTokenAmount
			? (tokenNetChange?.delta ??
					(nonNullish(value) ? (type === 'send' ? value * -1n : value) : undefined))
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
