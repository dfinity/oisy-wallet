import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { IcTransaction, IcTransactionUi } from '$lib/types/ic';
import type { IcpTransaction } from '$lib/types/icp';
import type { TokenId } from '$lib/types/token';
import { encodeIcrcAccount, type IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const mapIcTransaction = ({
	transaction,
	tokenId
}: {
	transaction: IcTransaction;
	tokenId: TokenId;
}): IcTransactionUi => {
	if (tokenId === ICP_TOKEN_ID) {
		return mapIcpTransaction({ transaction: transaction as IcpTransaction });
	}

	return mapIcrcTransaction({ transaction: transaction as IcrcTransactionWithId });
};

export const mapIcpTransaction = ({
	transaction: { transaction, id }
}: {
	transaction: IcpTransaction;
}): IcTransactionUi => {
	const { operation, created_at_time } = transaction;

	const tx: Pick<IcTransactionUi, 'timestamp' | 'id'> = {
		id,
		timestamp: fromNullable(created_at_time)?.timestamp_nanos
	};

	if ('Approve' in operation) {
		return {
			...tx,
			from: operation.Approve.from
		};
	}

	if ('Burn' in operation) {
		return {
			...tx,
			from: operation.Burn.from,
			value: BigNumber.from(operation.Burn.amount.e8s)
		};
	}

	if ('Mint' in operation) {
		return {
			...tx,
			to: operation.Mint.to,
			value: BigNumber.from(operation.Mint.amount.e8s)
		};
	}

	if ('Transfer' in operation) {
		return {
			...tx,
			from: operation.Transfer.from,
			to: operation.Transfer.to,
			value: BigNumber.from(operation.Transfer.amount.e8s)
		};
	}

	if ('TransferFrom' in operation) {
		return {
			...tx,
			from: operation.TransferFrom.from,
			to: operation.TransferFrom.to,
			value: BigNumber.from(operation.TransferFrom.amount.e8s)
		};
	}

	throw new Error(`Unknown transaction type ${JSON.stringify(transaction)}`);
};

const mapIcrcTransaction = ({
	transaction: { transaction, id }
}: {
	transaction: IcrcTransactionWithId;
}): IcTransactionUi => {
	const { timestamp, approve, burn, mint, transfer } = transaction;

	const data =
		fromNullable(approve) ?? fromNullable(burn) ?? fromNullable(mint) ?? fromNullable(transfer);

	if (isNullish(data)) {
		throw new Error(`Unknown transaction type ${JSON.stringify(transaction)}`);
	}

	const isApprove = nonNullish(fromNullable(approve));

	const value = isApprove
		? BigNumber.from(0n)
		: nonNullish(data?.amount)
			? BigNumber.from(data.amount)
			: undefined;

	return {
		id,
		from:
			'from' in data
				? encodeIcrcAccount({
						owner: data.from.owner,
						subaccount: fromNullable(data.from.subaccount)
					})
				: undefined,
		to:
			'to' in data
				? encodeIcrcAccount({
						owner: data.to.owner,
						subaccount: fromNullable(data.to.subaccount)
					})
				: undefined,
		...(nonNullish(value) && { value }),
		timestamp
	};
};
