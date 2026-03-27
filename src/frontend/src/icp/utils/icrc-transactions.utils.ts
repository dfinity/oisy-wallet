import { ICP_EXPLORER_URL } from '$env/explorers.env';
import type {
	IcTransactionType,
	IcTransactionUi,
	IcrcTransaction
} from '$icp/types/ic-transaction';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import type { OptionIdentity } from '$lib/types/identity';
import {
	fromNullable,
	fromNullishNullable,
	isNullish,
	jsonReplacer,
	nonNullish
} from '@dfinity/utils';
import {
	encodeIcrcAccount,
	fromCandidAccount,
	type IcrcIndexDid
} from '@icp-sdk/canisters/ledger/icrc';

export const mapTransactionIcrcToSelf = (tx: IcrcIndexDid.TransactionWithId): IcrcTransaction[] => {
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
		encodeIcrcAccount(fromCandidAccount(from)).toLowerCase() ===
		encodeIcrcAccount(fromCandidAccount(to)).toLowerCase();

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
		throw new Error(`Unknown transaction type ${JSON.stringify(transaction, jsonReplacer)}`);
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
	const isMint = nonNullish(fromNullable(mint));

	const source: Pick<IcTransactionUi, 'from' | 'incoming'> = {
		...('from' in data
			? mapFrom(encodeIcrcAccount(fromCandidAccount(data.from)))
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

	const approveFee = fromNullishNullable(fromNullable(approve)?.fee);
	const transferFee = fromNullishNullable(fromNullable(transfer)?.fee);

	const value = data?.amount;
	const fee = isApprove ? approveFee : transferFee;

	const approveData = fromNullable(approve);
	const approveSpender = nonNullish(approveData)
		? encodeIcrcAccount(fromCandidAccount(approveData.spender))
		: undefined;

	const approveExpiresAt = fromNullishNullable(approveData?.expires_at);

	return {
		id: `${id.toString()}${transferToSelf === 'receive' ? '-self' : ''}`,
		type,
		...source,
		to: 'to' in data ? encodeIcrcAccount(fromCandidAccount(data.to)) : undefined,
		...(nonNullish(value) && { value }),
		...(nonNullish(fee) && { fee }),
		timestamp,
		status: 'executed',
		...(nonNullish(approveSpender) && { approveSpender }),
		...(nonNullish(approveSpender) && {
			approveSpenderExplorerUrl: `${ICP_EXPLORER_URL}/account/${approveSpender}`
		}),
		...(nonNullish(approveExpiresAt) && { approveExpiresAt })
	};
};
