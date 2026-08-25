import { ZERO } from '$lib/constants/app.constants';
import { xrpHttpRpcUrl } from '$xrp/providers/xrp-rpc.providers';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpSubmitResult } from '$xrp/types/xrp-transaction';
import { isNullish } from '@dfinity/utils';

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

interface XrplAccountInfoResponse {
	result: {
		account_data?: { Balance: string };
		error?: string;
	};
}

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

	const {
		result: { account_data, error }
	}: XrplAccountInfoResponse = await response.json();

	if (error === 'actNotFound') {
		return ZERO;
	}

	if (isNullish(account_data)) {
		throw new Error(`Unexpected XRPL account_info response: ${error ?? 'missing account_data'}`);
	}

	return BigInt(account_data.Balance);
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
		accepted: engineResult.startsWith('tes') || engineResult.startsWith('ter')
	};
};
