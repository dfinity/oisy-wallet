<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { SOLANA_DEFAULT_DECIMALS, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { absBigInt } from '$lib/utils/bigint.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import type { SolNetBalanceChange } from '$sol/types/sol-transaction-summary';
	import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
	import { findEnabledSplToken, isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		transaction: SolTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let { type, value, timestamp, status, to, from, toOwner, fromOwner, summary, netChanges, fee } =
		$derived(transaction);

	// The venue of a routed swap: the program its legs ran through.
	let venue = $derived(
		summary?.kind === 'swap'
			? transaction.instructions?.find(({ kind }) => kind === 'route')?.program
			: undefined
	);

	const symbolOf = (tokenAddress: string | undefined): string =>
		isNullish(tokenAddress)
			? SOLANA_TOKEN.symbol
			: (findEnabledSplToken({
					tokens: $enabledSplTokens,
					tokenAddress,
					networkId: token.network.id
				})?.symbol ?? $i18n.transaction.text.unknown_token);

	const swapAmount = (change: SolNetBalanceChange): string =>
		formatToken({
			value: absBigInt(change.delta),
			unitName: change.decimals ?? SOLANA_DEFAULT_DECIMALS,
			displayDecimals: change.decimals ?? SOLANA_DEFAULT_DECIMALS
		});

	// The word for every kind but a swap, whose pair is the only thing that tells one swap from
	// another in a day of them.
	let label = $derived(
		isNullish(summary)
			? type === 'send'
				? $i18n.send.text.send
				: $i18n.receive.text.receive
			: summary.kind === 'send'
				? $i18n.send.text.send
				: summary.kind === 'receive'
					? $i18n.receive.text.receive
					: summary.kind === 'self'
						? nonNullish(summary.spent)
							? replacePlaceholders($i18n.transaction.text.summary_self, {
									$amount: swapAmount(summary.spent),
									$symbol: symbolOf(summary.spent.tokenAddress)
								})
							: $i18n.transaction.text.kind_other
						: summary.kind === 'swap'
							? nonNullish(summary.spent) && nonNullish(summary.received)
								? replacePlaceholders($i18n.transaction.text.summary_swap, {
										$spent: swapAmount(summary.spent),
										$spent_symbol: symbolOf(summary.spent.tokenAddress),
										$received: swapAmount(summary.received),
										$received_symbol: symbolOf(summary.received.tokenAddress)
									})
								: $i18n.swap.text.swap
							: $i18n.transaction.text.kind_other
	);

	// The net change of the token whose page this is: the SOL entry for the native token, the
	// entry of this mint for an SPL token. Absent when the transaction did not move it.
	let tokenNetChange = $derived(
		netChanges?.find((change) =>
			isTokenSpl(token) ? change.tokenAddress === token.address : isSolNetBalanceChangeSol(change)
		)
	);

	// Records from before the redesign carry no summary and keep their old signed value.
	let fallbackAmount = $derived(
		nonNullish(value) ? (type === 'send' ? value * -1n : value) : undefined
	);

	// Every row shows the net of the token it is about. A swap keeps a row per side, so each shows
	// its own half; a self-transfer nets to zero, which is exactly what it did to that token.
	//
	// SOL is the exception: its net leaves the fee out, because the modal states the cost apart
	// from what moved. A row has no such second line, so here it is the whole change to the
	// wallet, transfers and rent and fee together, which is what the balance actually did.
	let displayAmount = $derived(
		nonNullish(tokenNetChange)
			? isSolNetBalanceChangeSol(tokenNetChange)
				? tokenNetChange.delta - (fee ?? ZERO)
				: tokenNetChange.delta
			: isNullish(summary)
				? fallbackAmount
				: ZERO
	);

	let pending = $derived(status === 'processed' || isNullish(status));

	let transactionStatus: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	const modalId = Symbol();
</script>

<Transaction
	addressPrefixLabel={summary?.kind === 'swap' ? $i18n.transaction.text.swap_on : undefined}
	{displayAmount}
	from={summary?.kind === 'swap' ? undefined : (fromOwner ?? from)}
	{iconType}
	onClick={() => modalStore.openSolTransaction({ id: modalId, data: { transaction, token } })}
	status={transactionStatus}
	timestamp={nonNullish(timestamp) ? Number(timestamp) : timestamp}
	to={summary?.kind === 'swap' ? venue : (toOwner ?? to)}
	{token}
	{type}
>
	{label}
</Transaction>
