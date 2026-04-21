import { CustomEvmNetworkInputSchema } from '$eth/schema/custom-network.schema';
import {
	verifyChainId,
	type VerifyChainIdResult
} from '$eth/services/chain-id-verification.services';
import type { CustomEvmNetworkInput } from '$eth/stores/custom-evm-networks.store';
import type { NetworkEnvironment } from '$lib/types/network';

/**
 * Raw form state. All fields are strings because they come straight from the
 * user's input events; numeric coercion and URL validation happen in
 * `parseCustomEvmNetworkForm`. `env` is the only enum so we type it tightly.
 */
export interface CustomEvmNetworkFormValues {
	name: string;
	chainId: string;
	rpcUrl: string;
	currencySymbol: string;
	explorerUrl: string;
	iconUrl: string;
	env: NetworkEnvironment;
}

/**
 * Per-field error map. Absent keys mean "no error"; presence of any key means
 * the whole parse failed. The form component binds each input's error text to
 * the matching entry.
 *
 * `iconUrl` is intentionally included even though it's optional — if the user
 * types something we can still reject a malformed URL early, without waiting
 * for the probe step.
 */
export type CustomEvmNetworkFormErrors = Partial<Record<keyof CustomEvmNetworkFormValues, string>>;

export type ParseCustomEvmNetworkResult =
	| { ok: true; input: CustomEvmNetworkInput }
	| { ok: false; errors: CustomEvmNetworkFormErrors };

/**
 * Pure parser: trims and coerces `CustomEvmNetworkFormValues` into a validated
 * `CustomEvmNetworkInput`, or an error map keyed by form field.
 *
 * Why a parser instead of `CustomEvmNetworkInputSchema.safeParse` directly?
 * Two reasons:
 * 1. The form binds to strings; the store schema binds to `bigint`. The
 *    string → bigint coercion is non-trivial (empty, negative, non-numeric)
 *    and the error messaging is clearer when done field-by-field here.
 * 2. The Zod error paths don't map 1:1 to form field names once the coercion
 *    layer is in play. Rather than teach every consumer to translate Zod
 *    issues into field errors, we centralise the translation here.
 */
export const parseCustomEvmNetworkForm = (
	values: CustomEvmNetworkFormValues
): ParseCustomEvmNetworkResult => {
	const errors: CustomEvmNetworkFormErrors = {};
	const name = values.name.trim();
	const rpcUrl = values.rpcUrl.trim();
	const explorerUrl = values.explorerUrl.trim();
	const currencySymbol = values.currencySymbol.trim();
	const iconUrlTrimmed = values.iconUrl.trim();
	const chainIdRaw = values.chainId.trim();

	if (name.length === 0) {
		errors.name = 'Network name is required.';
	}
	if (currencySymbol.length === 0) {
		errors.currencySymbol = 'Currency symbol is required.';
	}
	if (rpcUrl.length === 0) {
		errors.rpcUrl = 'RPC URL is required.';
	}
	if (explorerUrl.length === 0) {
		errors.explorerUrl = 'Block explorer URL is required.';
	}

	// Coerce chainId: empty string, non-integer, and zero/negative all reject.
	let chainId: bigint | undefined;
	if (chainIdRaw.length === 0) {
		errors.chainId = 'Chain ID is required.';
	} else if (!/^[1-9]\d*$/.test(chainIdRaw)) {
		errors.chainId = 'Chain ID must be a positive integer.';
	} else {
		chainId = BigInt(chainIdRaw);
	}

	if (Object.keys(errors).length > 0 || chainId === undefined) {
		return { ok: false, errors };
	}

	// Delegate final shape/URL/refinement validation to the Zod schema. The
	// field-level checks above catch the common mistakes with friendlier
	// messages; Zod is the backstop for URL protocol, length bounds, etc.
	const candidate = {
		name,
		chainId,
		rpcUrl,
		currencySymbol,
		explorerUrl,
		// iconUrl is optional in the schema; pass it through only when present.
		...(iconUrlTrimmed.length > 0 ? { iconUrl: iconUrlTrimmed } : {}),
		env: values.env
	};
	const parsed = CustomEvmNetworkInputSchema.safeParse(candidate);
	if (!parsed.success) {
		// Translate Zod issues onto form fields. Anything we can't place
		// lands on the field that triggered it, inferred from `issue.path`.
		for (const issue of parsed.error.issues) {
			const [field] = issue.path;
			if (
				typeof field === 'string' &&
				(field === 'name' ||
					field === 'chainId' ||
					field === 'rpcUrl' ||
					field === 'currencySymbol' ||
					field === 'explorerUrl' ||
					field === 'iconUrl' ||
					field === 'env')
			) {
				errors[field] ??= issue.message;
			}
		}
		return { ok: false, errors };
	}

	return { ok: true, input: parsed.data };
};

/**
 * One-shot verification: parse the form then probe the RPC endpoint.
 *
 * The service layer calls `verifyChainId` so the wizard component never has
 * to import ethers directly — keeps the form's import graph lean and makes
 * the async boundary easy to mock in component tests.
 *
 * Returned variants:
 * - `{ status: 'invalid' }`: form failed schema parse; `errors` is the
 *   field map. No network call was made.
 * - `{ status: 'verified' }`: probe matched the declared chain ID. The
 *   caller can hand `input` straight to `customEvmNetworksStore.add`.
 * - `{ status: 'chain-mismatch' }`: probe succeeded but reported a
 *   different chain ID than what the user typed. The actual chain ID is
 *   returned so the UI can suggest "Did you mean N?".
 * - `{ status: 'rpc-unreachable' }`: the probe threw or timed out. The
 *   raw error message is surfaced for diagnostic display.
 */
export type VerifyCustomEvmNetworkFormResult =
	| { status: 'invalid'; errors: CustomEvmNetworkFormErrors }
	| { status: 'verified'; input: CustomEvmNetworkInput }
	| { status: 'chain-mismatch'; input: CustomEvmNetworkInput; actualChainId: bigint }
	| { status: 'rpc-unreachable'; input: CustomEvmNetworkInput; error: string };

export const verifyCustomEvmNetworkForm = async ({
	values,
	probe = verifyChainId
}: {
	values: CustomEvmNetworkFormValues;
	probe?: (args: { rpcUrl: string; expectedChainId: bigint }) => Promise<VerifyChainIdResult>;
}): Promise<VerifyCustomEvmNetworkFormResult> => {
	const parsed = parseCustomEvmNetworkForm(values);
	if (!parsed.ok) {
		return { status: 'invalid', errors: parsed.errors };
	}

	const { input } = parsed;
	const result = await probe({ rpcUrl: input.rpcUrl, expectedChainId: input.chainId });
	if (result.status === 'ok') {
		return { status: 'verified', input };
	}
	if (result.status === 'mismatch') {
		return { status: 'chain-mismatch', input, actualChainId: result.actualChainId };
	}
	return { status: 'rpc-unreachable', input, error: result.error };
};
