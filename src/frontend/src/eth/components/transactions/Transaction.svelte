<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { ComponentType } from 'svelte';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthTransactionType, EthTransactionUi } from '$eth/types/eth-transaction';
	import { isSupportedEthToken } from '$eth/utils/eth.utils';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
	import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import TransactionStatusComponent from '$lib/components/transactions/TransactionStatus.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { tokenSymbol } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let transaction: EthTransactionUi;

	let value: BigNumber;
	let timestamp: number | undefined;
	let displayTimestamp: number | undefined;
	let type: EthTransactionType;

	let pending: boolean;
	$: pending = isTransactionPending(transaction);

	let status: TransactionStatus;
	$: status = pending ? 'pending' : 'confirmed';

	$: ({ value, timestamp, displayTimestamp, uiType: type } = transaction);

	let ckTokenSymbol: string;
	$: ckTokenSymbol = isSupportedEthToken($token)
		? $token.twinTokenSymbol
		: // TODO: $token could be undefined, that's why we cast as `Erc20Token | undefined`; adjust the cast once we're sure that $token is never undefined
			(($token as Erc20Token | undefined)?.twinTokenSymbol ?? '');

	let label: string;
	$: label =
		type === 'withdraw'
			? replacePlaceholders(
					pending
						? $i18n.transaction.label.converting_ck_token
						: $i18n.transaction.label.ck_token_converted,
					{
						$twinToken: $tokenSymbol ?? '',
						$ckToken: ckTokenSymbol
					}
				)
			: type === 'deposit'
				? replacePlaceholders(
						pending
							? $i18n.transaction.label.converting_twin_token
							: $i18n.transaction.label.ck_token_sent,
						{
							$twinToken: $tokenSymbol ?? '',
							$ckToken: ckTokenSymbol
						}
					)
				: type === 'send'
					? $i18n.send.text.send
					: $i18n.receive.text.receive;

	let icon: ComponentType;
	$: icon =
		(type === 'withdraw' || type === 'deposit') && pending
			? IconConvert
			: type === 'withdraw'
				? IconConvertFrom
				: type === 'deposit'
					? IconConvertTo
					: type === 'send'
						? IconSend
						: IconReceive;

	let amount: BigNumber;
	$: amount = type === 'send' || type === 'deposit' ? value.mul(BigNumber.from(-1)) : value;

	let transactionDate: number | undefined;
	$: transactionDate = timestamp ?? displayTimestamp;
</script>

<button on:click={() => modalStore.openTransaction(transaction)} class="contents">
	<Card>
		{label}

		<RoundedIcon slot="icon" {icon} iconStyleClass={pending ? 'opacity-10' : ''} />

		<Amount {amount} slot="amount" />

		<svelte:fragment slot="description">
			{#if nonNullish(transactionDate)}
				{formatSecondsToDate(transactionDate)}
			{/if}

			<TransactionStatusComponent {status} />
		</svelte:fragment>
	</Card>
</button>
