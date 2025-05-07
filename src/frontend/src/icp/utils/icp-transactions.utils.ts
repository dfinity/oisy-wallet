import { ICP_EXPLORER_URL } from '$env/explorers.env';
import type {
	IcTransactionAddOnsInfo,
	IcTransactionUi,
	IcpTransaction
} from '$icp/types/ic-transaction';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { Tokens, Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import { fromNullable, jsonReplacer, nonNullish } from '@dfinity/utils';

export const mapTransactionIcpToSelf = (
	tx: TransactionWithId
): ({ transaction: Transaction & IcTransactionAddOnsInfo } & Pick<TransactionWithId, 'id'>)[] => {
	const { transaction, id } = tx;
	const { operation } = transaction;

	if (!('Transfer' in operation)) {
		return [
			{
				id,
				transaction
			}
		];
	}

	const {
		Transfer: { from, to }
	} = operation;

	return [
		{
			id,
			transaction: {
				...transaction,
				transferToSelf: 'send'
			}
		},
		...(from.toLowerCase() === to.toLowerCase()
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
export const mapIcpTransaction = ({
	transaction: { transaction, id },
	identity
}: {
	transaction: IcpTransaction;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const { operation, timestamp, transferToSelf } = transaction;

	const tx: Pick<IcTransactionUi, 'timestamp' | 'id' | 'status' | 'txExplorerUrl'> = {
		id: `${id.toString()}${transferToSelf === 'receive' ? '-self' : ''}`,
		timestamp: fromNullable(timestamp)?.timestamp_nanos,
		status: 'executed',
		txExplorerUrl: `${ICP_EXPLORER_URL}/transaction/${id}`
	};

	const accountIdentifier = nonNullish(identity)
		? getAccountIdentifier(identity.getPrincipal())
		: undefined;

	const mapFrom = (
		from: string
	): Pick<IcTransactionUi, 'from' | 'fromExplorerUrl' | 'incoming'> => ({
		from,
		fromExplorerUrl: `${ICP_EXPLORER_URL}/account/${from}`,
		incoming:
			from?.toLowerCase() !== accountIdentifier?.toHex().toLowerCase() ||
			transferToSelf === 'receive'
	});

	const mapTo = (to: string): Pick<IcTransactionUi, 'to' | 'toExplorerUrl'> => ({
		to,
		toExplorerUrl: `${ICP_EXPLORER_URL}/account/${to}`
	});

	const mapAmount = ({
		amount,
		fee,
		incoming
	}: {
		incoming: boolean | undefined;
		fee: Tokens;
		amount: Tokens;
	}): bigint => amount.e8s + (incoming === false ? fee.e8s : ZERO);

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
			value: operation.Burn.amount.e8s
		};
	}

	if ('Mint' in operation) {
		return {
			...tx,
			type: 'mint',
			...mapTo(operation.Mint.to),
			incoming: true,
			value: operation.Mint.amount.e8s
		};
	}

	if ('Transfer' in operation) {
		const source = mapFrom(operation.Transfer.from);

		return {
			...tx,
			type: source.incoming === false ? 'send' : 'receive',
			...source,
			...mapTo(operation.Transfer.to),
			value: mapAmount({
				amount: operation.Transfer.amount,
				fee: operation.Transfer.fee,
				incoming: source.incoming
			})
		};
	}

	throw new Error(`Unknown transaction type ${JSON.stringify(transaction, jsonReplacer)}`);
};
