import type { BuiltDeltaOrder } from '@velora-dex/sdk';
import { Signature } from 'ethers/crypto';
import { TypedDataEncoder } from 'ethers/hash';

/**
 * Generates the EIP-712 hash of typed structured data, used for signing with `eth_signTypedData`.
 *
 * This hash can be used for signature verification or as a digest passed to a smart contract.
 *
 * Velora also returns the hash as `BuiltDeltaOrder.orderHash`, but we re-derive it from the typed
 * data so that we only ever sign a digest we computed ourselves.
 *
 * @param params - The EIP-712 structured data including domain, types, and message.
 * @returns A hexadecimal string (prefixed with `0x`) representing the hash of the typed data.
 *
 */
export const getSignParamsEIP712 = ({ domain, types, value }: BuiltDeltaOrder['toSign']): string =>
	TypedDataEncoder.hash(domain, types, value);

/**
 * Converts a full ECDSA signature (65 bytes) into a compact serialized format (64 bytes).
 *
 * @param signature - A standard ECDSA signature string (65-byte hex format, `0x...`).
 * @returns A compact signature string (64-byte hex format, `0x...`).
 *
 */
export const getCompactSignature = (signature: string) =>
	Signature.from(signature).compactSerialized;
