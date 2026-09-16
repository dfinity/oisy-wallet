import { ZERO } from '$lib/constants/app.constants';
import { xrpHttpRpcUrl } from '$xrp/providers/xrp-rpc.providers';
import { XrplAccountInfoResponseSchema } from '$xrp/schema/xrpl-rpc.schema';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpAccountInfo, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';

const xrpJsonRpc = async ({
	network,
	method,
	params
}: {
	network: XrpNetworkType;
	method: string;
	params: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
	const response = await fetch(xrpHttpRpcUrl(network), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ method, params: [params] })
	});

	if (!response.ok) {
		throw new Error(`XRPL ${method} request failed with status ${response.status}`);
	}

	const { result }: { result: Record<string, unknown> } = await response.json();

	return result;
};

/**
 * Native XRP balance in drops (1 XRP = 1,000,000 drops), via the XRP Ledger
 * JSON-RPC `account_info` method.
 *
 * An account that has never been funded does not exist on-ledger and the node
 * answers with the `actNotFound` error; that is a valid zero balance, not a
 * failure, so it maps to {@link ZERO}.
 */
export const loadXrpBalance = async ({
	address,
	network
}: {
	address: XrpAddress;
	network: XrpNetworkType;
}): Promise<XrpBalance> => {
	const response = await fetch(xrpHttpRpcUrl(network), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			method: 'account_info',
			params: [{ account: address, ledger_index: 'validated' }]
		})
	});

	if (!response.ok) {
		throw new Error(`XRPL account_info request failed with status ${response.status}`);
	}

	// The response is untrusted external JSON: validate it before converting, so a malformed
	// `Balance` cannot pass through `BigInt` as a plausible-looking amount.
	const parsed = XrplAccountInfoResponseSchema.safeParse(await response.json());

	if (!parsed.success) {
		throw new Error('Unexpected XRPL account_info response: it does not match the expected shape');
	}

	const { result } = parsed.data;

	if ('error' in result) {
		if (result.error === 'actNotFound') {
			return ZERO;
		}

		throw new Error(`Unexpected XRPL account_info response: ${result.error}`);
	}

	return BigInt(result.account_data.Balance);
};

/**
 * Account balance (drops), current `Sequence` and `OwnerCount` for a funded account.
 * Unlike {@link loadXrpBalance}, this throws for an unfunded account (`actNotFound`): you
 * cannot build a valid transaction without a sequence number.
 *
 * `OwnerCount` is needed for the reserve: every ledger object the account owns raises the
 * amount it must retain beyond the base reserve.
 */
export const loadXrpAccountInfo = async ({
	address,
	network
}: {
	address: XrpAddress;
	network: XrpNetworkType;
}): Promise<XrpAccountInfo> => {
	const result = await xrpJsonRpc({
		network,
		method: 'account_info',
		params: { account: address, ledger_index: 'validated' }
	});

	const accountData = result.account_data as
		{ Balance: string; Sequence: number; OwnerCount?: unknown } | undefined;

	if (isNullish(accountData)) {
		throw new Error(
			`Unexpected XRPL account_info response: ${(result.error as string) ?? 'missing account_data'}`
		);
	}

	// `OwnerCount` drives the owner reserve, so a missing or non-numeric value must not be read
	// as zero: that under-reserves and lets `getXrpMaxAmount` return more than the ledger accepts.
	if (typeof accountData.OwnerCount !== 'number') {
		throw new Error('Unexpected XRPL account_info response: missing or invalid OwnerCount');
	}

	return {
		balance: BigInt(accountData.Balance),
		sequence: accountData.Sequence,
		ownerCount: accountData.OwnerCount
	};
};

/**
 * Current open-ledger fee in drops via the `fee` method. Falls back to the base fee,
 * and finally to `fallbackFee`, if the node omits the open-ledger estimate.
 */
export const loadXrpOpenLedgerFee = async ({
	network,
	fallbackFee
}: {
	network: XrpNetworkType;
	fallbackFee: XrpBalance;
}): Promise<XrpBalance> => {
	const result = await xrpJsonRpc({ network, method: 'fee', params: {} });

	const drops = result.drops as { open_ledger_fee?: string; base_fee?: string } | undefined;
	const fee = drops?.open_ledger_fee ?? drops?.base_fee;

	return nonNullish(fee) ? BigInt(fee) : fallbackFee;
};

/** Current (in-progress) ledger index via `ledger_current`, used to set `LastLedgerSequence`. */
/**
 * Index of the ledger currently being built. This is the right base for choosing a
 * `LastLedgerSequence` at signing time, but NOT for deciding that a transaction expired:
 * the open index has already advanced past a closed ledger whose transactions are not yet
 * validated. Use `loadXrpValidatedLedgerIndex` for that.
 */
export const loadXrpLedgerIndex = async ({
	network
}: {
	network: XrpNetworkType;
}): Promise<number> => {
	const result = await xrpJsonRpc({ network, method: 'ledger_current', params: {} });

	const ledgerIndex = result.ledger_current_index as number | undefined;

	if (isNullish(ledgerIndex)) {
		throw new Error('Unexpected XRPL ledger_current response: missing ledger_current_index');
	}

	return ledgerIndex;
};

/**
 * Index of the latest validated ledger. A transaction can only be declared expired once
 * this — not the open index — has passed its `LastLedgerSequence`.
 */
export const loadXrpValidatedLedgerIndex = async ({
	network
}: {
	network: XrpNetworkType;
}): Promise<number> => {
	const result = await xrpJsonRpc({
		network,
		method: 'ledger',
		params: { ledger_index: 'validated' }
	});

	const ledgerIndex = (result.ledger_index ??
		(result.ledger as { ledger_index?: number } | undefined)?.ledger_index) as number | undefined;

	if (isNullish(ledgerIndex)) {
		throw new Error('Unexpected XRPL ledger response: missing validated ledger_index');
	}

	return ledgerIndex;
};

/**
 * The final outcome of a transaction hash, via the `tx` method.
 *
 * `validated` only means the transaction is **final**, not that it succeeded: a
 * fee-claiming `tec*` transaction is validated too. Callers must therefore decide on
 * `transactionResult` (the validated `meta.TransactionResult`), not on `validated` alone.
 */
export const loadXrpTransactionOutcome = async ({
	hash,
	network
}: {
	hash: string;
	network: XrpNetworkType;
}): Promise<{ validated: boolean; transactionResult: string | undefined }> => {
	const result = await xrpJsonRpc({
		network,
		method: 'tx',
		params: { transaction: hash }
	});

	const { TransactionResult } = (result.meta ?? {}) as { TransactionResult?: string };

	return {
		validated: result.validated === true,
		transactionResult: TransactionResult
	};
};

/**
 * Broadcasts a signed transaction blob via the XRPL `submit` method.
 *
 * `accepted` reports whether the node took the transaction; `engine_result` is its
 * provisional result (e.g. `tesSUCCESS`, `terQUEUED`, `tecUNFUNDED_PAYMENT`). Neither
 * alone means the payment will succeed — an applied `tec*` result is accepted too — so
 * callers must judge the result class (see `isXrpSubmitAccepted`) and then confirm
 * finality *and* success by polling the tx hash (see {@link loadXrpTransactionOutcome}).
 */
export const submitXrpTransaction = async ({
	txBlob,
	network
}: {
	txBlob: string;
	network: XrpNetworkType;
}): Promise<XrpSubmitResult> => {
	const result = await xrpJsonRpc({ network, method: 'submit', params: { tx_blob: txBlob } });

	const engineResult = result.engine_result as string | undefined;

	if (isNullish(engineResult)) {
		throw new Error(
			`Unexpected XRPL submit response: ${(result.error as string) ?? 'no engine_result'}`
		);
	}

	return {
		engineResult,
		engineResultMessage: result.engine_result_message as string | undefined,
		txHash: (result.tx_json as { hash?: string } | undefined)?.hash,
		// The node reports whether it took the transaction (applied/queued/broadcast/kept) in the
		// authoritative `accepted` flag. The `engine_result` prefix is NOT a reliable proxy: `ter`
		// is a retry class where e.g. `terPRE_SEQ`/`terNO_ACCOUNT` are not queued.
		accepted: result.accepted === true
	};
};
