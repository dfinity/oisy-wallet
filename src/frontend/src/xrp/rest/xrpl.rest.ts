import { ZERO } from '$lib/constants/app.constants';
import { xrpHttpRpcUrl } from '$xrp/providers/xrp-rpc.providers';
import { XrplAccountInfoResponseSchema } from '$xrp/schema/xrpl-rpc.schema';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpBalance } from '$xrp/types/xrp-balance';

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
