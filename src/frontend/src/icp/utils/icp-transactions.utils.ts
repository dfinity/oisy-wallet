import { ICP_EXPLORER_URL } from '$env/explorers.env';
import type {
	IcTransactionAddOnsInfo,
	IcTransactionUi,
	IcpTransaction
} from '$icp/types/ic-transaction';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { fromNullable, fromNullishNullable, jsonReplacer, nonNullish } from '@dfinity/utils';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

export const mapTransactionIcpToSelf = (
	tx: IcpIndexDid.TransactionWithId
): ({ transaction: IcpIndexDid.Transaction & IcTransactionAddOnsInfo } & Pick<
	IcpIndexDid.TransactionWithId,
	'id'
>)[] => {
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
	identity: NullishIdentity;
}): IcTransactionUi => {
	const { operation, timestamp, transferToSelf, memo: nat64Memo, icrc1_memo } = transaction;

	// ICP transactions carry the memo in one of two fields depending on the send path:
	// - icrc1_memo (Uint8Array): set when sending to a principal via icrc1_transfer
	// - memo (nat64/bigint): set when sending to a classic AccountIdentifier via transfer; 0 means unset
	const icrc1MemoBytes = fromNullishNullable(icrc1_memo);
	const memo = nonNullish(icrc1MemoBytes)
		? new TextDecoder().decode(icrc1MemoBytes)
		: nat64Memo !== ZERO
			? nat64Memo.toString()
			: undefined;

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

	const memoField = nonNullish(memo) && memo.trim() !== '' ? { memo } : {};

	if ('Approve' in operation) {
		const approve = operation.Approve;
		const approveValue = approve.allowance.e8s;
		const approveFee = approve.fee?.e8s;
		const approveExpiresAt = fromNullable(approve.expires_at)?.timestamp_nanos;

		return {
			...tx,
			...memoField,
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
			...memoField,
			type: 'burn',
			...mapFrom(operation.Burn.from),
			value: operation.Burn.amount.e8s
		};
	}

	if ('Mint' in operation) {
		return {
			...tx,
			...memoField,
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
			...memoField,
			type: source.incoming === false ? 'send' : 'receive',
			...source,
			...mapTo(operation.Transfer.to),
			value: operation.Transfer.amount.e8s,
			...(nonNullish(transferFee) && { fee: transferFee })
		};
	}

	throw new Error(`Unknown transaction type ${JSON.stringify(transaction, jsonReplacer)}`);
};
