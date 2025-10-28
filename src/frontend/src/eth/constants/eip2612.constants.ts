export const PERMIT_DEADLINE_SECONDS = 5 * 60;

export const EIP2612_TYPES = {
	Permit: [
		{ name: 'owner', type: 'address' },
		{ name: 'spender', type: 'address' },
		{ name: 'value', type: 'uint256' },
		{ name: 'nonce', type: 'uint256' },
		{ name: 'deadline', type: 'uint256' }
	]
};
