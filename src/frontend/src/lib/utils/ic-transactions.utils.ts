import type { IcTransaction, IcTransactionType, IcTransactionUi } from '$icp/types/ic';
import type { IcpTransaction } from '$icp/types/icp';
import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import { getAccountIdentifier } from '$lib/utils/icp-account.utils';
import { getIcrcAccount } from '$lib/utils/icrc-account.utils';
import { encodeIcrcAccount, type IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const mapIcTransaction = ({
	transaction,
	tokenId,
	...rest
}: {
	transaction: IcTransaction;
	tokenId: TokenId;
	identity: OptionIdentity;
}): IcTransactionUi => {
	if (tokenId === ICP_TOKEN_ID) {
		return mapIcpTransaction({ transaction: transaction as IcpTransaction, ...rest });
	}

	return mapIcrcTransaction({ transaction: transaction as IcrcTransactionWithId, ...rest });
};

export const mapIcpTransaction = ({
	transaction: { transaction, id },
	identity
}: {
	transaction: IcpTransaction;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const { operation, created_at_time } = transaction;

	const tx: Pick<IcTransactionUi, 'timestamp' | 'id'> = {
		id,
		timestamp: fromNullable(created_at_time)?.timestamp_nanos
	};

	const accountIdentifier = nonNullish(identity)
		? getAccountIdentifier(identity.getPrincipal())
		: undefined;

	const mapFrom = (from: string): Pick<IcTransactionUi, 'from' | 'incoming'> => ({
		from,
		incoming: from?.toLowerCase() !== accountIdentifier?.toHex().toLowerCase()
	});

	if ('Approve' in operation) {
		return {
			...tx,
			type: 'approve',
			...mapFrom(operation.Approve.from)
		};
	}

	if ('Burn' in operation) {
		return {
			...tx,
			type: 'burn',
			...mapFrom(operation.Burn.from),
			value: BigNumber.from(operation.Burn.amount.e8s)
		};
	}

	if ('Mint' in operation) {
		return {
			...tx,
			type: 'mint',
			to: operation.Mint.to,
			incoming: false,
			value: BigNumber.from(operation.Mint.amount.e8s)
		};
	}

	if ('Transfer' in operation) {
		return {
			...tx,
			type: 'transfer',
			...mapFrom(operation.Transfer.from),
			to: operation.Transfer.to,
			value: BigNumber.from(operation.Transfer.amount.e8s)
		};
	}

	if ('TransferFrom' in operation) {
		return {
			...tx,
			type: 'transfer-from',
			...mapFrom(operation.TransferFrom.from),
			to: operation.TransferFrom.to,
			value: BigNumber.from(operation.TransferFrom.amount.e8s)
		};
	}

	throw new Error(`Unknown transaction type ${JSON.stringify(transaction)}`);
};

const mapIcrcTransaction = ({
	transaction: { transaction, id },
	identity
}: {
	transaction: IcrcTransactionWithId;
	identity: OptionIdentity;
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

	const accountIdentifier = nonNullish(identity)
		? encodeIcrcAccount(getIcrcAccount(identity.getPrincipal()))
		: undefined;

	const mapFrom = (from: string): Pick<IcTransactionUi, 'from' | 'incoming'> => ({
		from,
		incoming: from?.toLowerCase() !== accountIdentifier?.toLowerCase()
	});

	const type: IcTransactionType = nonNullish(fromNullable(approve))
		? 'approve'
		: nonNullish(fromNullable(burn))
			? 'burn'
			: nonNullish(fromNullable(mint))
				? 'mint'
				: 'transfer';

	return {
		id,
		type,
		...('from' in data &&
			mapFrom(
				encodeIcrcAccount({
					owner: data.from.owner,
					subaccount: fromNullable(data.from.subaccount)
				})
			)),
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
