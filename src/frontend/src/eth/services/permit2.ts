import type { Erc20Token } from '$eth/types/erc20';
import { permit2Address, SignatureTransfer, type PermitTransferFrom } from '@uniswap/permit2-sdk';

const PERMIT2_ABI = ['function nonceBitmap(address owner, uint256 wordPos) view returns (uint256)'];

export const buildPermit2Digest = ({
	owner,
	chainId,
	token,
	amount,
	spender,
	deadline,
	now
}: {
	owner: string;
	chainId: number;
	token: Erc20Token;
	amount: bigint;
	spender: string;
	deadline: string;
	now: string;
}) => {
	const permit2Add = permit2Address(chainId);
	// const now = Math.floor(Date.now() / 1000);
	// const deadline = BigInt(now + 5 * 60);

	const permit: PermitTransferFrom = {
		permitted: { token: token.address, amount: amount.toString() },
		spender,
		nonce: now,
		deadline
	};

	const { domain, types, values } = SignatureTransfer.getPermitData(permit, permit2Add, chainId);

	return { domain, types, values };
};
