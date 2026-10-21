import { ZERO } from '$lib/constants/app.constants';
import {
	LIFI_CARRIED_FEE_HEADROOM_PERCENT,
	LIFI_GAS_LIMIT_BUFFER_PERCENT,
	LIFI_REVIEW_GAS_BUFFER_PERCENT
} from '$lib/constants/swap.constants';
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

const withPercent = ({ value, percent }: { value: bigint; percent: bigint }): bigint =>
	(value * (100n + percent)) / 100n;

// What execution signs with, on top of the node's estimate.
export const withLifiGasBuffer = (gas: bigint): bigint =>
	withPercent({ value: gas, percent: LIFI_GAS_LIMIT_BUFFER_PERCENT });

// What the review prices, on top of LI.FI's estimate: more than execution's buffer, because the
// node estimates the same transaction a little above LI.FI.
export const withLifiReviewGasBuffer = (gas: bigint): bigint =>
	withPercent({ value: gas, percent: LIFI_REVIEW_GAS_BUFFER_PERCENT });

/**
 * The fee ceiling a refused execution carried back, re-priced at the fee per gas the review now
 * uses, with headroom on the gas and the L1 data fee alike. Re-priced rather than kept as it was:
 * a gas price that ticked up since would otherwise refuse the retry again.
 */
export const lifiCarriedFeeCeiling = ({
	gas,
	l1Fee,
	maxFeePerGas
}: {
	gas: bigint;
	l1Fee: bigint;
	maxFeePerGas: bigint;
}): bigint =>
	withPercent({ value: gas, percent: LIFI_CARRIED_FEE_HEADROOM_PERCENT }) * maxFeePerGas +
	withPercent({ value: l1Fee, percent: LIFI_CARRIED_FEE_HEADROOM_PERCENT });

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

/**
 * LI.FI's fee is a ceiling OISY signs with, so the native balance must cover all of it: on top of
 * the amount for a native source, on its own for an ERC-20 one.
 */
export const isLifiFeeAffordable = ({
	fee,
	amount,
	isNativeSource,
	nativeBalance
}: {
	fee: bigint;
	amount: bigint;
	isNativeSource: boolean;
	nativeBalance: bigint;
}): boolean => (isNativeSource ? amount : ZERO) + fee <= nativeBalance;
