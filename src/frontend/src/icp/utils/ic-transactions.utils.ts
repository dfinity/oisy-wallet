import type {
	IcpTransaction,
	IcrcTransaction,
	IcTransaction,
	IcTransactionType,
	IcTransactionUi
} from '$icp/types/ic';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import { encodeIcrcAccount } from '@dfinity/ledger-icrc';
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

	return mapIcrcTransaction({ transaction: transaction as IcrcTransaction, ...rest });
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
		const source = mapFrom(operation.Transfer.from);

		return {
			...tx,
			type: source.incoming === false ? 'send' : 'receive',
			...source,
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
	transaction: IcrcTransaction;
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

	const source: Pick<IcTransactionUi, 'from' | 'incoming'> = {
		...('from' in data &&
			mapFrom(
				encodeIcrcAccount({
					owner: data.from.owner,
					subaccount: fromNullable(data.from.subaccount)
				})
			))
	};

	const type: IcTransactionType = nonNullish(fromNullable(approve))
		? 'approve'
		: nonNullish(fromNullable(burn))
			? 'burn'
			: nonNullish(fromNullable(mint))
				? 'mint'
				: source.incoming === false
					? 'send'
					: 'receive';

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
		timestamp
	};
};
