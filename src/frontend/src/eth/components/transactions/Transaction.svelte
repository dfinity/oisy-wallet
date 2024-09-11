<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { ComponentType } from 'svelte';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthTransactionType } from '$eth/types/eth-transaction';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import { ckMinterInfoAddresses } from '$icp-eth/derived/cketh.derived';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import IconMint from '$lib/components/icons/IconMint.svelte';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import TransactionPending from '$lib/components/transactions/TransactionPending.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { tokenId, tokenWithFallback } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Transaction } from '$lib/types/transaction';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let transaction: Transaction;

	let from: string;
	let value: BigNumber;
	let timestamp: number | undefined;
	let displayTimestamp: number | undefined;

	let pending: boolean;
	$: pending = isTransactionPending(transaction);

	$: ({ from, to, value, timestamp, displayTimestamp } = transaction);

	let type: EthTransactionType;
	$: type = $ckMinterInfoAddresses.includes(from.toLowerCase())
		? 'withdraw'
		: $ckMinterInfoAddresses.includes(to?.toLowerCase())
			? 'deposit'
			: from?.toLowerCase() === $ethAddress?.toLowerCase()
				? 'send'
				: 'receive';

	let twinTokenSymbol: string;
	$: twinTokenSymbol =
		nonNullish($tokenId) && isSupportedEthTokenId($tokenId)
			? 'ckETH'
			: ($tokenWithFallback as Erc20Token).twinTokenSymbol ?? '';

	let label: string;
	$: label =
		type === 'withdraw'
			? replacePlaceholders(
					pending
						? $i18n.transaction.label.converting_ck_token
						: $i18n.transaction.label.ck_token_converted,
					{
						$twinToken: $tokenWithFallback.symbol,
						$ckToken: twinTokenSymbol
					}
				)
			: type === 'deposit'
				? replacePlaceholders(
						pending
							? $i18n.transaction.label.converting_twin_token
							: $i18n.transaction.label.ck_token_sent,
						{
							$token: $tokenWithFallback.symbol,
							$ckToken: twinTokenSymbol
						}
					)
				: type === 'send'
					? $i18n.send.text.send
					: $i18n.receive.text.receive;

	let label: string;
	$: label = type === 'send' ? $i18n.send.text.send : $i18n.receive.text.receive;

	let icon: ComponentType;
	$: icon =
		(type === 'withdraw' || type === 'deposit') && pending
			? IconConvert
			: type === 'withdraw'
				? IconMint
				: type === 'deposit'
					? IconBurn
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

			<TransactionPending {pending} />
		</svelte:fragment>
	</Card>
</button>
