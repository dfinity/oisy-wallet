<script lang="ts">
	import { assertNever, nonNullish } from '@dfinity/utils';
	import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
	import { ercTransfersByNetworkAndHash } from '$eth/derived/eth-transactions.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import { isSupportedEthToken } from '$eth/utils/eth.utils';
	import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
	import {
		isTransactionPending,
		isMaxUint256,
		tryDecodeErc20AbiData,
		findErcTransfer,
		formatErcTransferAsset,
		isErc20TransactionDeposit,
		isErc20TransactionTransfer
	} from '$eth/utils/transactions.utils';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { ZERO } from '$lib/constants/app.constants';
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
		transferRecipient,
		hash,
		data,
		gasUsed,
		gasPrice
	} = $derived(transaction);

	let isApprove = $derived(type === 'approve');

	let isErc20Deposit = $derived(isErc20TransactionDeposit(data));

	let isErc20Transfer = $derived(type === 'send' && isErc20TransactionTransfer(data));

	let { to: dataTo, value: dataValue } = $derived(
		(isApprove || isErc20Deposit || isErc20Transfer) && nonNullish(data)
			? tryDecodeErc20AbiData({ data })
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

	// Both `approve` and ERC20 `transfer` transactions are addressed to the ERC20 contract, so the
	// transaction `to` identifies the token the transaction is about - not the spender or the recipient.
	let contractToken = $derived(
		(isApprove || isErc20Transfer) && nonNullish(to)
			? $ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: to, networkId }) &&
						networkId === token.network.id
				)
			: undefined
	);

	let approveToken = $derived(isApprove ? contractToken : undefined);

	// A zero-value native send is the fee entry of a token transfer: the transfer itself moved no
	// native value. Its loaded counterpart is the `Transfer` event, so it describes a direct transfer,
	// a router send and a `transferFrom` alike - unlike the calldata, which only covers the first.
	let ercTransfer = $derived(
		type === 'send' && value === ZERO && isTokenEthereumNative(token)
			? findErcTransfer({
					hash,
					networkId: token.network.id,
					transfers: $ercTransfersByNetworkAndHash
				})
			: undefined
	);

	// Calldata carrying the transfer selector still may not decode. Without a recipient and an amount
	// there is nothing for the calldata to contribute, so only a loaded transfer can resolve it.
	let transferDecoded = $derived(isErc20Transfer && nonNullish(dataTo) && nonNullish(dataValue));

	// Falls back to the calldata when the transferred token is not loaded, so that the entry does not
	// change label once an unrelated token list finishes loading.
	let transferToken = $derived(ercTransfer?.token ?? (transferDecoded ? contractToken : undefined));

	let transferValue = $derived(
		nonNullish(ercTransfer)
			? ercTransfer.transaction.value
			: nonNullish(transferToken)
				? dataValue
				: undefined
	);

	// The transaction is addressed to the token contract, so showing `to` as the counterparty of a
	// send would present the contract as the recipient. The recipient comes from the loaded transfer,
	// or from the calldata.
	//
	// Deliberately not gated on `transferToken`: recognising the contract is what lets us name the
	// asset and show the fee, not what makes the decoded address the recipient. Requiring it would
	// put the contract back in the counterparty of every transfer of a token we do not know.
	let recipient = $derived(ercTransfer?.transaction.to ?? transferRecipient ?? to);

	// The fee is known from the receipt whether or not the token is: naming the asset needs the
	// contract, accounting for what left the native balance does not. Either source establishes the
	// entry as the fee side of a transfer - the loaded one also covers a router send, which no
	// calldata decode can. A transfer that also moved native value is a real native send.
	let isTransferFeeEntry = $derived((nonNullish(ercTransfer) || transferDecoded) && value === ZERO);

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

	let transferAmountText = $derived(
		nonNullish(transferToken)
			? formatErcTransferAsset({
					token: transferToken,
					value: transferValue,
					tokenId: ercTransfer?.transaction.tokenId
				})
			: undefined
	);

	let label = $derived.by(() => {
		if (type === 'send') {
			if (isErc20Deposit && nonNullish(depositToken) && nonNullish(depositValue)) {
				return replacePlaceholders($i18n.send.text.send_token, {
					$token: `${depositValue} ${depositToken.symbol}`
				});
			}

			if (nonNullish(transferAmountText)) {
				return replacePlaceholders($i18n.send.text.send_token, {
					$token: transferAmountText
				});
			}

			// The transfer is known to be one, but the token is not in the wallet: without decimals and
			// a symbol its amount cannot be stated, so the entry says what it is rather than nothing.
			if (isTransferFeeEntry) {
				return $i18n.send.text.send_unknown_token;
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
		isApprove || isErc20Deposit || isTransferFeeEntry
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
	to={recipient}
	token={isApprove ? token : displayToken}
	{tokenId}
	{type}
>
	{label}
</Transaction>
