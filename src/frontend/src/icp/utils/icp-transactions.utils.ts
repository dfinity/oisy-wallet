import { ICP_EXPLORER_URL } from '$env/explorers.env';
import type {
	IcTransactionAddOnsInfo,
	IcTransactionUi,
	IcpTransaction
} from '$icp/types/ic-transaction';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { fromNullable, jsonReplacer, nonNullish } from '@dfinity/utils';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const TEXT_DECODER = new TextDecoder();

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

	const icrc1MemoBytes = fromNullable(icrc1_memo);
	const icrc1MemoText = nonNullish(icrc1MemoBytes)
		? TEXT_DECODER.decode(icrc1MemoBytes).trim()
		: undefined;
	const memoText =
		nonNullish(icrc1MemoText) && icrc1MemoText !== ''
			? icrc1MemoText
			: nat64Memo !== ZERO
				? nat64Memo.toString()
				: undefined;
	const memoField = nonNullish(memoText) ? { memo: memoText } : {};

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
			approveSpenderExplorerUrl: `${ICP_EXPLORER_URL}/account/${approve.spender}`,
			...memoField
		};
	}

	if ('Burn' in operation) {
		return {
			...tx,
			type: 'burn',
			...mapFrom(operation.Burn.from),
			value: operation.Burn.amount.e8s,
			...memoField
		};
	}

	if ('Mint' in operation) {
		return {
			...tx,
			type: 'mint',
			...mapTo(operation.Mint.to),
			incoming: true,
			value: operation.Mint.amount.e8s,
			...memoField
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
			...(nonNullish(transferFee) && { fee: transferFee }),
			...memoField
		};
	}

	throw new Error(`Unknown transaction type ${JSON.stringify(transaction, jsonReplacer)}`);
};
