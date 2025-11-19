import { ICP_EXPLORER_URL } from '$env/explorers.env';
import type {
	IcTransactionAddOnsInfo,
	IcTransactionUi,
	IcpTransaction
} from '$icp/types/ic-transaction';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import type { OptionIdentity } from '$lib/types/identity';
import type { Transaction, TransactionWithId } from '@icp-sdk/canisters/ledger/icp';
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

	if ('Approve' in operation) {
		const approve = operation.Approve;
		const approveValue = approve.allowance.e8s;
		const approveFee = approve.fee?.e8s;
		const approveExpiresAt = fromNullable(approve.expires_at)?.timestamp_nanos;

		return {
			...tx,
			type: 'approve',
			...mapFrom(operation.Approve.from),
			value: approveValue,
			...(nonNullish(approveFee) && { fee: approveFee }),
			...(nonNullish(approveExpiresAt) && { approveExpiresAt }),
			approveSpender: approve.spender,
			approveSpenderExplorerUrl: `${ICP_EXPLORER_URL}/account/${approve.spender}`
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
		const transferFee = operation.Transfer.fee?.e8s;

		return {
			...tx,
			type: source.incoming === false ? 'send' : 'receive',
			...source,
			...mapTo(operation.Transfer.to),
			value: operation.Transfer.amount.e8s,
			...(nonNullish(transferFee) && { fee: transferFee })
		};
	}

	throw new Error(`Unknown transaction type ${JSON.stringify(transaction, jsonReplacer)}`);
};
