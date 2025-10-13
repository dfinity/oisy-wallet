const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export const buildPermit2Digest = ({
	chainId,
	token,
	amount,
	spender,
	now,
	deadline
}: {
	chainId: number;
	token: { address: string };
	amount: bigint;
	spender: string;
	now: string;
	deadline: string;
}) => {
	const domain = {
		name: 'Permit2',
		chainId,
		verifyingContract: PERMIT2_ADDRESS
	};

	const types = {
		PermitTransferFrom: [
			{ name: 'permitted', type: 'TokenPermissions' },
			{ name: 'spender', type: 'address' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' }
		],
		TokenPermissions: [
			{ name: 'token', type: 'address' },
			{ name: 'amount', type: 'uint256' }
		]
	};

	const values = {
		permitted: {
			token: token.address,
			amount: amount.toString()
		},
		spender,
		nonce: now,
		deadline
	};

	return { domain, types, values };
};
