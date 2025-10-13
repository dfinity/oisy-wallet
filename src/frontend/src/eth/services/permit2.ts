import { INFURA_API_KEY } from '$env/rest/infura.env';
import { SignatureTransfer, permit2Address } from '@uniswap/permit2-sdk';
import { ethers } from 'ethers';
import { InfuraProvider } from 'ethers/providers';

const PERMIT2_ABI = ['function nonces(address) view returns (uint256)'];

export const buildPermit2Digest = async ({ owner, chainId, token, amountWei, spender }: any) => {
	const provider = new InfuraProvider(chainId, INFURA_API_KEY);

	const permit2Add = permit2Address(chainId);

	const permit2 = new ethers.Contract(permit2Add, PERMIT2_ABI, provider);
	const nonce = await permit2.nonces(owner);

	const now = Math.floor(Date.now() / 1000);
	const deadline = BigInt(now + 5 * 60);

	const permit = {
		permitted: { token: token.address, amount: amountWei },
		spender,
		nonce,
		deadline
	};

	const { domain, types, values } = SignatureTransfer.getPermitData(permit, permit2Add, chainId);

	return { domain, types, values };
};
