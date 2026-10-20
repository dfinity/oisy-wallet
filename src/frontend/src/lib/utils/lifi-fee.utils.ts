import { ZERO } from '$lib/constants/app.constants';
import { LIFI_GAS_LIMIT_BUFFER_PERCENT } from '$lib/constants/swap.constants';
import type { LiFiStep } from '@lifi/sdk';
import { dataLength, encodeRlp, toBeArray } from 'ethers/utils';

// The widest nonce an account can sign with, so the widest one RLP encodes.
const MAX_NONCE = 2n ** 64n - 1n;

/**
 * The gas units LI.FI estimates the swap transaction at — its `SEND` gas costs, every live quote
 * carrying exactly one (2026-10-20) — or `undefined` when it gives none, or one that is not a plain
 * number. An `APPROVE` cost is left out, the approvals being budgeted on their own, and so is every
 * `amount`: a cost at LI.FI's own gas price, while OISY prices the gas itself.
 */
export const lifiQuoteGas = ({ estimate: { gasCosts } }: LiFiStep): bigint | undefined => {
	const sends = (gasCosts ?? []).filter(({ type }) => type === 'SEND');

	if (sends.length === 0 || !sends.every(({ estimate }) => /^\d+$/.test(estimate))) {
		return;
	}

	return sends.reduce((sum, { estimate }) => sum + BigInt(estimate), ZERO);
};

export const withLifiGasBuffer = (gas: bigint): bigint =>
	(gas * (100n + LIFI_GAS_LIMIT_BUFFER_PERCENT)) / 100n;

/**
 * The size of the unsigned EIP-1559 transaction, in bytes: the type byte and the RLP of its fields.
 * Signed with the largest possible nonce, whose encoding is the widest, so that the size bounds the
 * transaction whatever nonce it is signed with later. It prices the OP-stack L1 data fee, which
 * grows with the size: a bound too small would leave the fee the user reviewed below the one paid.
 */
export const lifiUnsignedTxSize = ({
	chainId,
	to,
	data,
	value,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	nonce = MAX_NONCE
}: {
	chainId: bigint;
	to: string;
	data: string;
	value: bigint;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	nonce?: bigint;
}): bigint =>
	BigInt(
		1 +
			dataLength(
				encodeRlp([
					toBeArray(chainId),
					toBeArray(nonce),
					toBeArray(maxPriorityFeePerGas),
					toBeArray(maxFeePerGas),
					toBeArray(gas),
					to,
					toBeArray(value),
					data,
					// No access list.
					[]
				])
			)
	);

/**
 * How many approval transactions `approve()` sends before an ERC-20 swap: none when the allowance
 * already covers the amount, one when there is none, two when a smaller one is reset to zero first.
 */
export const lifiApprovalCount = ({
	allowance,
	amount
}: {
	allowance: bigint;
	amount: bigint;
}): 0 | 1 | 2 => (allowance >= amount ? 0 : allowance === ZERO ? 1 : 2);
