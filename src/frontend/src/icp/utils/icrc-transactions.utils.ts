import type { IcrcTransaction, IcTransactionType, IcTransactionUi } from '$icp/types/ic';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import type { OptionIdentity } from '$lib/types/identity';
import { encodeIcrcAccount, type IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const mapTransactionIcrcToSelf = (tx: IcrcTransactionWithId): IcrcTransaction[] => {
	const { transaction, id } = tx;
	const { transfer: t } = transaction;

	const transfer = fromNullable(t);

	if (isNullish(transfer)) {
		return [
			{
				id,
				transaction
			}
		];
	}

	const { from, to } = transfer;

	const isSelfTransaction =
		encodeIcrcAccount({
			owner: from.owner,
			subaccount: fromNullable(from.subaccount)
		}).toLowerCase() ===
		encodeIcrcAccount({
			owner: to.owner,
			subaccount: fromNullable(to.subaccount)
		}).toLowerCase();

	return [
		{
			id,
			transaction: {
				...transaction,
				transferToSelf: 'send'
			}
		},
		...(isSelfTransaction
			? [
					{
						id,
						transaction: {
							...transaction,
							transferToSelf: 'receive' as const
						}
					}
				]
			: [])
	];
};

export const mapIcrcTransaction = ({
	transaction: { transaction, id },
	identity
}: {
	transaction: IcrcTransaction;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const { timestamp, approve, burn, mint, transfer, transferToSelf } = transaction;

	const data =
		fromNullable(approve) ?? fromNullable(burn) ?? fromNullable(mint) ?? fromNullable(transfer);

	if (isNullish(data)) {
		throw new Error(`Unknown transaction type ${JSON.stringify(transaction)}`);
	}

	const accountIdentifier = nonNullish(identity)
		? encodeIcrcAccount(getIcrcAccount(identity.getPrincipal()))
		: undefined;

	const mapFrom = (from: string): Pick<IcTransactionUi, 'from' | 'incoming'> => ({
		from,
		incoming:
			from?.toLowerCase() !== accountIdentifier?.toLowerCase() || transferToSelf === 'receive'
	});

	const isApprove = nonNullish(fromNullable(approve));
	const isTransfer = nonNullish(fromNullable(transfer));
	const isMint = nonNullish(fromNullable(mint));

	const source: Pick<IcTransactionUi, 'from' | 'incoming'> = {
		...('from' in data
			? mapFrom(
					encodeIcrcAccount({
						owner: data.from.owner,
						subaccount: fromNullable(data.from.subaccount)
					})
				)
			: isMint
				? { incoming: true }
				: {})
	};

	const type: IcTransactionType = nonNullish(fromNullable(approve))
		? 'approve'
		: nonNullish(fromNullable(burn))
			? 'burn'
			: isMint
				? 'mint'
				: source.incoming === false
					? 'send'
					: 'receive';

	const value = isApprove
		? BigNumber.from(0n)
		: nonNullish(data?.amount)
			? BigNumber.from(data.amount).add(
					isTransfer && source.incoming === false
						? fromNullable(fromNullable(transfer)?.fee ?? []) ?? 0n
						: 0n
				)
			: undefined;

	return {
		id,
		type,
		...source,
		to:
			'to' in data
				? encodeIcrcAccount({
						owner: data.to.owner,
						subaccount: fromNullable(data.to.subaccount)
					})
				: undefined,
		...(nonNullish(value) && { value }),
		timestamp,
		status: 'executed'
	};
};
