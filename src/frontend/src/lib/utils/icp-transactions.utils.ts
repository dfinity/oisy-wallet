import type { IcpTransaction } from '$lib/types/icp';
import { fromNullable } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export type IcpTransactionUi = {
	from?: string;
	to?: string;
	value?: BigNumber;
	timestamp?: bigint;
};

export const mapIcpTransaction = ({
	transaction: { transaction }
}: {
	transaction: IcpTransaction;
}): IcpTransactionUi => {
	const { operation, created_at_time } = transaction;

	const tx: Pick<IcpTransactionUi, 'timestamp'> = {
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

	throw new Error('Unsupported type of transaction');
};
