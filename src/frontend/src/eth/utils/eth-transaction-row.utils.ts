import { assertNever, nonNullish } from '@dfinity/utils';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import { isSupportedEthToken } from '$eth/utils/eth.utils';
import {
	decodeErc20AbiData,
	isErc20TransactionDeposit,
	isMaxUint256,
	isTransactionPending
} from '$eth/utils/transactions.utils';
import type { TransactionRowUi } from '$lib/types/transaction-row';
import type { Token } from '$lib/types/token';
import type { TransactionStatus } from '$lib/types/transaction';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

interface EthRowLabelI18n {
	send: string;
	receive: string;
	sendToken: string;
	approveLabel: string;
	unlimited: string;
	convertingCkToken: string;
	ckTokenConverted: string;
	convertingTwinToken: string;
}

type EthFungibleToken = Token & { address: string };

export interface EthTransactionRowViewModel {
	row: TransactionRowUi;
	label: string;
}

export const mapEthTransactionToRowUi = ({
	transaction: { display, type, to, from, tokenId, approveSpender },
	token,
	status,
	transactionDate
}: {
	transaction: EthTransactionUi;
	token: Token;
	status: TransactionStatus;
	transactionDate: number | undefined;
}): TransactionRowUi => ({
	displayAmount: display.amount,
	type,
	status,
	timestamp: transactionDate,
	to,
	from,
	tokenId,
	approveSpender,
	token
});

export const mapEthTransactionToViewModel = ({
	transaction,
	token,
	ercFungibleTokens,
	i18n
}: {
	transaction: EthTransactionUi;
	token: Token;
	ercFungibleTokens: EthFungibleToken[];
	i18n: EthRowLabelI18n;
}): EthTransactionRowViewModel => {
	const pending = isTransactionPending(transaction);
	const status: TransactionStatus = pending ? 'pending' : 'confirmed';
	const transactionDate = transaction.timestamp ?? transaction.displayTimestamp;
	const { type, to, data, display } = transaction;

	const isApprove = type === 'approve';
	const isErc20Deposit =
		display.isErc20Deposit === true || isErc20TransactionDeposit(transaction.data);

	const { to: dataTo } =
		(isApprove || isErc20Deposit) && nonNullish(data)
			? decodeErc20AbiData({ data })
			: { to: undefined };

	const depositToken = isErc20Deposit
		? ercFungibleTokens.find(
				({ address, network: { id: networkId } }) =>
					areAddressesEqual({ address1: address, address2: dataTo, networkId }) &&
					networkId === token.network.id
			)
		: undefined;

	const approveToken =
		isApprove && nonNullish(to)
			? ercFungibleTokens.find(
					({ address, network: { id: networkId } }) =>
						areAddressesEqual({ address1: address, address2: to, networkId }) &&
						networkId === token.network.id
				)
			: undefined;

	const displayToken = approveToken ?? token;
	const approveValue = display.labelAmount;

	const approveAmountText = !isApprove
		? undefined
		: display.isUnlimitedApprove || isMaxUint256(approveValue)
			? replacePlaceholders(i18n.unlimited, { $items: getTokenDisplaySymbol(displayToken) })
			: `${formatToken({
					value: display.labelAmount,
					displayDecimals: displayToken.decimals,
					unitName: displayToken.decimals
				})} ${getTokenDisplaySymbol(displayToken)}`;

	const label = (() => {
		if (type === 'send') {
			if (isErc20Deposit && nonNullish(depositToken)) {
				return replacePlaceholders(i18n.sendToken, { $token: depositToken.symbol });
			}

			return i18n.send;
		}

		if (type === 'receive') {
			return i18n.receive;
		}

		if (type === 'approve') {
			return replacePlaceholders(i18n.approveLabel, {
				$approveAmount: approveAmountText ?? ''
			});
		}

		const ckTokenSymbol = isSupportedEthToken(token)
			? token.twinTokenSymbol
			: // TODO: $token could be undefined, that's why we cast as `Erc20Token | undefined`; adjust the cast once we're sure that $token is never undefined
				((token as Erc20Token | undefined)?.twinTokenSymbol ?? '');

		if (type === 'withdraw') {
			return replacePlaceholders(pending ? i18n.convertingCkToken : i18n.ckTokenConverted, {
				$twinToken: token?.symbol ?? '',
				$ckToken: ckTokenSymbol
			});
		}

		if (type === 'deposit') {
			if (isErc20Deposit && nonNullish(depositToken)) {
				return replacePlaceholders(i18n.sendToken, { $token: depositToken.symbol });
			}

			return replacePlaceholders(pending ? i18n.convertingTwinToken : i18n.send, {
				$twinToken: token?.symbol ?? '',
				$ckToken: ckTokenSymbol
			});
		}

		assertNever(type, `Unsupported transaction type: ${type}`);
	})();

	const row = mapEthTransactionToRowUi({
		transaction,
		token: isApprove ? token : displayToken,
		status,
		transactionDate
	});

	return {
		row,
		label
	};
};
