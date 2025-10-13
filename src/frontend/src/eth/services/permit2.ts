import { INFURA_API_KEY } from '$env/rest/infura.env';
import type { Erc20Token } from '$eth/types/erc20';
import { SignatureTransfer, permit2Address, type PermitTransferFrom } from '@uniswap/permit2-sdk';
import { ethers } from 'ethers';
import { InfuraProvider } from 'ethers/providers';

const PERMIT2_ABI = ['function nonces(address) view returns (uint256)'];

export const buildPermit2Digest = async ({
	owner,
	chainId,
	token,
	amount,
	spender
}: {
	owner: string;
	chainId: number;
	token: Erc20Token;
	amount: bigint;
	spender: string;
}) => {
	const provider = new InfuraProvider(chainId, INFURA_API_KEY);
	const permit2Add = permit2Address(chainId);
	const permit2 = new ethers.Contract(permit2Add, PERMIT2_ABI, provider);
	const nonce = await permit2.nonces(owner);

	const now = Math.floor(Date.now() / 1000);
	const deadline = BigInt(now + 5 * 60);

	const permit: PermitTransferFrom = {
		permitted: { token: token.address, amount: amount.toString() },
		spender,
		nonce: nonce.toString(),
		deadline: deadline.toString()
	};

	const { domain, types, values } = SignatureTransfer.getPermitData(permit, permit2Add, chainId);

	return { domain, types, values };
};
