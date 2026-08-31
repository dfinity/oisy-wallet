<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { SOLANA_DEFAULT_DECIMALS, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { absBigInt } from '$lib/utils/bigint.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { splTokenMetadataStore } from '$sol/stores/spl-token-metadata.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import type { SolNetBalanceChange } from '$sol/types/sol-transaction-summary';
	import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
	import { solTokenSymbol, solUnknownTokenAddresses } from '$sol/utils/sol-token-name.utils';
	import { formatSolTransactionSummary } from '$sol/utils/sol-transaction-summary.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

	interface Props {
		transaction: SolTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
		// Whether this row sits in a list filtered to one token. The activity shows what a
		// transaction moved; a token's own page shows what it did to that token, cost included.
		singleToken?: boolean;
	}

	let { transaction, token, iconType = 'transaction', singleToken = false }: Props = $props();

	let { type, value, timestamp, status, to, from, toOwner, fromOwner, summary, netChanges, fee } =
		$derived(transaction);

	// The venue of a routed swap: the program its legs ran through.
	let venue = $derived(
		summary?.kind === 'swap'
			? transaction.instructions?.find(({ kind }) => kind === 'route')?.program
			: undefined
	);

	// The mints this row mentions, so a placeholder is numbered against the others beside it.
	let unknownTokenAddresses = $derived(
		solUnknownTokenAddresses({
			tokenAddresses: (netChanges ?? []).map(({ tokenAddress }) => tokenAddress),
			tokens: $enabledSplTokens,
			networkId: token.network.id,
			metadata: $splTokenMetadataStore
		})
	);

	const symbolOf = (tokenAddress: string | undefined): string =>
		solTokenSymbol({
			tokenAddress,
			tokens: $enabledSplTokens,
			networkId: token.network.id,
			metadata: $splTokenMetadataStore,
			unknownTokenAddresses,
			unknownTokenLabel: $i18n.transaction.text.unknown_token,
			nativeSymbol: SOLANA_TOKEN.symbol
		});

	const swapAmount = (change: SolNetBalanceChange): string =>
		formatToken({
			value: absBigInt(change.delta),
			unitName: change.decimals ?? SOLANA_DEFAULT_DECIMALS,
			displayDecimals: change.decimals ?? SOLANA_DEFAULT_DECIMALS
		});

	// Records from before the redesign carry no summary, and their kind is all the old shape said.
	let label = $derived(
		nonNullish(summary)
			? formatSolTransactionSummary({
					summary,
					i18n: $i18n,
					symbolOf,
					amountOf: swapAmount
				})
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

	// Records from before the redesign carry no summary and keep their old signed value.
	let fallbackAmount = $derived(
		nonNullish(value) ? (type === 'send' ? value * -1n : value) : undefined
	);

	// What the transaction moved in this row's token, with the cost left out. A swap keeps a row
	// per side, so each shows its own half; a self-transfer nets to zero, which is exactly what it
	// did to that token. The net already excludes the fee.
	let movedAmount = $derived(
		nonNullish(tokenNetChange) ? tokenNetChange.delta : isNullish(summary) ? fallbackAmount : ZERO
	);

	// A token's own page is where the cost of using it belongs. For SOL that is the fee on top of
	// whatever the transaction moved, and for a transaction that moved no SOL at all it is the
	// whole story: the wallet paid to send something else.
	//
	// The activity never shows it. A swap into SOL whose fee outweighed what it bought would read
	// there as a loss, on the row that says what was bought.
	let displayAmount = $derived(
		singleToken && !isTokenSpl(token) && nonNullish(movedAmount)
			? movedAmount - (fee ?? ZERO)
			: movedAmount
	);

	let pending = $derived(status === 'processed' || isNullish(status));

	let transactionStatus: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	const modalId = Symbol();
</script>

<Transaction
	addressPrefixLabel={summary?.kind === 'swap' ? $i18n.transaction.text.swap_on : undefined}
	{displayAmount}
	from={summary?.kind === 'swap' ? undefined : (fromOwner ?? from)}
	icon={summary?.kind === 'swap' ? IconConvert : undefined}
	iconAriaLabel={summary?.kind === 'swap' ? $i18n.swap.text.swap : undefined}
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
