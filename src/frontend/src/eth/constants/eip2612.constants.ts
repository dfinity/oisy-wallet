/**
 * Default permit deadline offset in seconds
 *
 * Set to 5 minutes (300 seconds) to provide sufficient time for:
 * - User to review and sign the permit
 * - Transaction to be submitted to the network
 *
 */
export const PERMIT_DEADLINE_SECONDS = 5 * 60;

/**
 * EIP-2612 Permit Type Definition
 *
 * Defines the typed data structure for EIP-2612 permit signatures.
 * This allows token approvals via off-chain signatures instead of on-chain transactions.
 *
 * @see https://eips.ethereum.org/EIPS/eip-2612
 *
 * Structure:
 * - owner: Address of the token owner granting the approval
 * - spender: Address that will be approved to spend tokens
 * - value: Amount of tokens to approve (in wei/smallest unit)
 * - nonce: Current nonce of the owner (prevents replay attacks)
 * - deadline: Unix timestamp when the permit expires
 *
 */

export const EIP2612_TYPES = {
	Permit: [
		{ name: 'owner', type: 'address' },
		{ name: 'spender', type: 'address' },
		{ name: 'value', type: 'uint256' },
		{ name: 'nonce', type: 'uint256' },
		{ name: 'deadline', type: 'uint256' }
	]
};
