<script lang="ts">
	import { assertNever, nonNullish } from '@dfinity/utils';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { isSupportedEthToken } from '$eth/utils/eth.utils';
	import {
		isTransactionPending,
		isMaxUint256,
		decodeErc20AbiData,
		isErc20TransactionDeposit
	} from '$eth/utils/transactions.utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import type { TransactionStatus } from '$lib/types/transaction';
	import { areAddressesEqual } from '$lib/utils/address.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		transaction: EthTransactionUi;
		token: Token;
		iconType?: 'token' | 'transaction';
	}

	let { transaction, token, iconType = 'transaction' }: Props = $props();

	let pending = $derived(isTransactionPending(transaction));

	let status: TransactionStatus = $derived(pending ? 'pending' : 'confirmed');

	let {
		value,
		timestamp,
		displayTimestamp,
		type,
		to,
		from,
		tokenId,
		approveSpender,
		data,
		gasUsed,
		gasPrice
	} = $derived(transaction);

	let isApprove = $derived(type === 'approve');

	let isErc20Deposit = $derived(isErc20TransactionDeposit(data));

	let { to: dataTo, value: dataValue } = $derived(
		(isApprove || isErc20Deposit) && nonNullish(data)
			? decodeErc20AbiData({ data })
			: { to: undefined, value: undefined }
	);

	let depositToken = $derived(
		isErc20Deposit && nonNullish(dataTo)
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: dataTo, networkId }) &&
						networkId === token.network.id
				)
			: undefined
	);

	let depositValue = $derived(
		isErc20Deposit && nonNullish(depositToken) && nonNullish(dataValue)
			? formatToken({
					value: dataValue,
					displayDecimals: depositToken.decimals,
					unitName: depositToken.decimals
				})
			: undefined
	);

	let approveToken = $derived(
		isApprove && nonNullish(to)
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: to, networkId }) &&
						networkId === token.network.id
				)
			: undefined
	);

	let displayToken = $derived(approveToken ?? token);

	let approveValue = $derived(isApprove ? dataValue : undefined);

	let approveAmountText = $derived.by(() => {
		if (!isApprove) {
			return;
		}

		const symbolText = getTokenDisplaySymbol(displayToken);

		if (isMaxUint256(approveValue)) {
			return replacePlaceholders($i18n.core.text.unlimited, {
				$items: symbolText
			});
		}

		if (nonNullish(approveValue)) {
			const valueText = formatToken({
				value: approveValue,
				displayDecimals: displayToken.decimals,
				unitName: displayToken.decimals
			});

			return `${valueText} ${symbolText}`;
		}

		return symbolText;
	});

	let label = $derived.by(() => {
		if (type === 'send') {
			if (isErc20Deposit && nonNullish(depositToken) && nonNullish(depositValue)) {
				return replacePlaceholders($i18n.send.text.send_token, {
					$token: `${depositValue} ${depositToken.symbol}`
				});
			}

			return $i18n.send.text.send;
		}

		if (type === 'receive') {
			return $i18n.receive.text.receive;
		}

		if (type === 'approve') {
			return replacePlaceholders($i18n.transaction.text.approve_label, {
				$approveAmount: approveAmountText ?? ''
			});
		}

		const ckTokenSymbol = isSupportedEthToken(token)
			? token.twinTokenSymbol
			: // TODO: $token could be undefined, that's why we cast as `Erc20Token | undefined`; adjust the cast once we're sure that $token is never undefined
				((token as Erc20Token | undefined)?.twinTokenSymbol ?? '');

		if (type === 'withdraw') {
			return replacePlaceholders(
				pending
					? $i18n.transaction.label.converting_ck_token
					: $i18n.transaction.label.ck_token_converted,
				{
					$twinToken: token?.symbol ?? '',
					$ckToken: ckTokenSymbol
				}
			);
		}

		if (type === 'deposit') {
			if (isErc20Deposit && nonNullish(depositToken)) {
				return replacePlaceholders($i18n.send.text.send_token, {
					$token: depositToken.symbol
				});
			}

			return replacePlaceholders(
				pending ? $i18n.transaction.label.converting_twin_token : $i18n.send.text.send,
				{
					$twinToken: token?.symbol ?? '',
					$ckToken: ckTokenSymbol
				}
			);
		}

		assertNever(type, `Unsupported transaction type: ${type}`);
	});

	let gasFee = $derived(
		nonNullish(gasUsed) && nonNullish(gasPrice) ? gasUsed * gasPrice : undefined
	);

	let displayAmount = $derived(
		isApprove || isErc20Deposit
			? nonNullish(gasFee)
				? gasFee * -1n
				: undefined
			: value * (type === 'send' || type === 'deposit' ? -1n : 1n)
	);

	let transactionDate = $derived(timestamp ?? displayTimestamp);

	const modalId = Symbol();
</script>

<Transaction
	{approveSpender}
	{displayAmount}
	{from}
	{iconType}
	onClick={() => modalStore.openEthTransaction({ id: modalId, data: { transaction, token } })}
	{status}
	timestamp={transactionDate}
	{to}
	token={isApprove ? token : displayToken}
	{tokenId}
	{type}
>
	{label}
</Transaction>
