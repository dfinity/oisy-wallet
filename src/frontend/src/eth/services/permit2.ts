import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC20_PERMIT_ABI } from '$eth/constants/erc20.constants';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import { signPrehash } from '$lib/api/signer.api';
import type { Identity } from '@dfinity/agent';
import { Contract, Signature } from 'ethers';
import { TypedDataEncoder } from 'ethers/hash';
import { InfuraProvider } from 'ethers/providers';
import { concat, toBeHex, zeroPadValue } from 'ethers/utils';

const PERMIT_DEADLINE_SECONDS = 5 * 60;

const EIP2612_TYPES = {
	Permit: [
		{ name: 'owner', type: 'address' },
		{ name: 'spender', type: 'address' },
		{ name: 'value', type: 'uint256' },
		{ name: 'nonce', type: 'uint256' },
		{ name: 'deadline', type: 'uint256' }
	]
};

interface PermitParams {
	token: Erc20Token;
	userAddress: EthAddress;
	spender: string;
	value: string;
	identity: Identity;
	nonce?: string;
	deadline?: number;
}

interface PermitMetadata {
	nonce: string;
	name: string;
	version: string;
	deadline: number;
}

interface EIP2612Domain {
	name: string;
	version: string;
	chainId: number;
	verifyingContract: string;
}

interface EIP2612Values {
	owner: string;
	spender: string;
	value: string;
	nonce: string;
	deadline: string;
}

interface PermitResult {
	nonce: string;
	deadline: number;
	encodedPermit: string;
}

interface FetchPermitMetadataParams {
	tokenContract: Contract;
	userAddress: EthAddress;
	customNonce?: string;
	customDeadline?: number;
}

interface CreateEIP2612TypedDataParams {
	token: Erc20Token;
	userAddress: EthAddress;
	spender: string;
	value: string;
	metadata: PermitMetadata;
}

const createDeadline = ({
	offsetSeconds = PERMIT_DEADLINE_SECONDS
}: { offsetSeconds?: number } = {}): number => Math.floor(Date.now() / 1000) + offsetSeconds;

const fetchPermitMetadata = async ({
	tokenContract,
	userAddress,
	customDeadline
}: FetchPermitMetadataParams): Promise<PermitMetadata> => {
	const [nonce, name] = await Promise.all([
		tokenContract.nonces(userAddress),
		tokenContract.name()
	]);

	return {
		name,
		version: '1',
		nonce: nonce.toString(),
		deadline: customDeadline ?? createDeadline()
	};
};

/**
 * Creates EIP-2612 typed data structure
 */
const createEIP2612TypedData = ({
	token,
	userAddress,
	spender,
	value,
	metadata
}: CreateEIP2612TypedDataParams): {
	domain: EIP2612Domain;
	types: typeof EIP2612_TYPES;
	values: EIP2612Values;
} => {
	const domain: EIP2612Domain = {
		name: metadata.name,
		version: metadata.version,
		chainId: Number(token.network.chainId),
		verifyingContract: token.address
	};

	const values: EIP2612Values = {
		owner: userAddress,
		spender,
		value,
		nonce: metadata.nonce,
		deadline: metadata.deadline.toString()
	};

	return {
		domain,
		types: EIP2612_TYPES,
		values
	};
};

const createPermitHash = async ({
	token,
	userAddress,
	spender,
	value,
	nonce,
	deadline
}: Omit<PermitParams, 'identity'>): Promise<{ hash: string; metadata: PermitMetadata }> => {
	const provider = new InfuraProvider(token.network.chainId, INFURA_API_KEY);
	const tokenContract = new Contract(token.address, ERC20_PERMIT_ABI, provider);

	const metadata = await fetchPermitMetadata({
		tokenContract,
		userAddress,
		customNonce: nonce,
		customDeadline: deadline
	});

	const { domain, types, values } = createEIP2612TypedData({
		token,
		userAddress,
		spender,
		value,
		metadata
	});

	const hash = TypedDataEncoder.hash(domain, types, values);

	return { hash, metadata };
};

/**
 * Creates complete permit with signature, nonce, and deadline
 *
 * @param params - Permit parameters
 * @returns Complete permit data including signature, nonce, and deadline
 */
export const createPermit = async (params: PermitParams): Promise<PermitResult> => {
	const { identity, ...permitParams } = params;

	const { hash, metadata } = await createPermitHash(permitParams);

	const signatureData = await signPrehash({
		hash,
		identity
	});

	const signature = Signature.from(signatureData);

	const encodedPermit = concat([
		zeroPadValue(params.userAddress, 32), // 32 bytes: owner
		zeroPadValue(params.spender, 32), // 32 bytes: spender
		toBeHex(params.value, 32), // 32 bytes: value
		toBeHex(metadata.deadline, 32), // 32 bytes: deadline
		toBeHex(signature.v, 32), // 32 bytes: v (uint8 padded to 32)
		signature.r, // 32 bytes: r
		signature.s // 32 bytes: s
	]);

	return {
		nonce: metadata.nonce,
		deadline: metadata.deadline,
		encodedPermit
	};
};
