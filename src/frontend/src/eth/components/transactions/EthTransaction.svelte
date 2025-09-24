<script lang="ts">
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { isSupportedEthToken } from '$eth/utils/eth.utils';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		transaction: EthTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let pending = $derived(isTransactionPending(transaction));

	let status: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	let { value, timestamp, displayTimestamp, type, to, from, tokenId } = $derived(transaction);

	let ckTokenSymbol = $derived(
		isSupportedEthToken(token)
			? token.twinTokenSymbol
			: // TODO: $token could be undefined, that's why we cast as `Erc20Token | undefined`; adjust the cast once we're sure that $token is never undefined
				((token as Erc20Token | undefined)?.twinTokenSymbol ?? '')
	);

	let label = $derived(
		type === 'withdraw'
			? replacePlaceholders(
					pending
						? $i18n.transaction.label.converting_ck_token
						: $i18n.transaction.label.ck_token_converted,
					{
						$twinToken: token?.symbol ?? '',
						$ckToken: ckTokenSymbol
					}
				)
			: type === 'deposit'
				? replacePlaceholders(
						pending
							? $i18n.transaction.label.converting_twin_token
							: $i18n.transaction.label.ck_token_sent,
						{
							$twinToken: token?.symbol ?? '',
							$ckToken: ckTokenSymbol
						}
					)
				: type === 'send'
					? $i18n.send.text.send
					: $i18n.receive.text.receive
	);

	let amount = $derived(value * (type === 'send' || type === 'deposit' ? -1n : 1n));

	let transactionDate = $derived(timestamp ?? displayTimestamp);

	const modalId = Symbol();
</script>

<Transaction
	{amount}
	{from}
	{iconType}
	onClick={() => modalStore.openEthTransaction({ id: modalId, data: { transaction, token } })}
	{status}
	timestamp={transactionDate}
	{to}
	{token}
	{tokenId}
	{type}
>
	{label}
</Transaction>
