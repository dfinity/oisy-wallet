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
 * Account balance (drops) and current `Sequence` for a funded account. Unlike
 * {@link loadXrpBalance}, this throws for an unfunded account (`actNotFound`): you
 * cannot build a valid transaction without a sequence number.
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

	const accountData = result.account_data as { Balance: string; Sequence: number } | undefined;

	if (isNullish(accountData)) {
		throw new Error(
			`Unexpected XRPL account_info response: ${(result.error as string) ?? 'missing account_data'}`
		);
	}

	return { balance: BigInt(accountData.Balance), sequence: accountData.Sequence };
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

/** Whether a transaction hash has been included in a validated ledger (via the `tx` method). */
export const isXrpTransactionValidated = async ({
	hash,
	network
}: {
	hash: string;
	network: XrpNetworkType;
}): Promise<boolean> => {
	const result = await xrpJsonRpc({
		network,
		method: 'tx',
		params: { transaction: hash }
	});

	return result.validated === true;
};

/**
 * Broadcasts a signed transaction blob via the XRPL `submit` method.
 *
 * `engine_result` is the node's provisional result (e.g. `tesSUCCESS`, `terQUEUED`);
 * a `tes`/`ter` code means the node accepted the transaction for processing, which is
 * not yet final validation. Callers should confirm finality by polling the tx hash.
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
		accepted: (result.accepted as boolean | undefined) ?? false
	};
};
