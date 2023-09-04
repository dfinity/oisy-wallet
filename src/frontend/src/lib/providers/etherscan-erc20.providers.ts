import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { Erc20ContractAddress, Erc20Metadata } from '$lib/types/erc20';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';
import { EtherscanProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
const NETWORK = import.meta.env.VITE_ETHERSCAN_NETWORK;

const provider = new EtherscanProvider(NETWORK, API_KEY);

// https://ethereum.org/en/developers/docs/standards/tokens/erc-20/
const abiERC20 = [
	'function name() public view returns (string)',
	'function symbol() public view returns (string)',
	'function decimals() public view returns (uint8)',
	'function totalSupply() public view returns (uint256)',
	'function balanceOf(address _owner) public view returns (uint256 balance)',
	'function transfer(address _to, uint256 _value) public returns (bool success)',
	'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
	'function approve(address _spender, uint256 _value) public returns (bool success)',
	'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',
	'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
	'event Approval(address indexed _owner, address indexed _spender, uint256 _value)'
];

export const metadata = async ({ address }: Erc20ContractAddress): Promise<Erc20Metadata> => {
	const erc20Contract = new ethers.Contract(address, abiERC20, provider);

	const [name, symbol, decimals] = await Promise.all([
		erc20Contract.name(),
		erc20Contract.symbol(),
		erc20Contract.decimals()
	]);

	return {
		name,
		symbol,
		decimals
	};
};

export const balance = async ({
	contract: { address: contractAddress },
	address
}: {
	contract: Erc20ContractAddress;
	address: ECDSA_PUBLIC_KEY;
}): Promise<BigNumber> => {
	const erc20Contract = new ethers.Contract(contractAddress, abiERC20, provider);

	return erc20Contract.balanceOf(address);
};

export const getFeeData = async ({
	contract: { address: contractAddress },
	address
}: {
	contract: Erc20ContractAddress;
	address: ECDSA_PUBLIC_KEY;
}): Promise<BigNumber> => {
	const erc20Contract = new ethers.Contract(contractAddress, abiERC20, provider);
	// TODO: real value
	// TODO: transfer?
	return erc20Contract.estimateGas.approve(address, '1000000'); // approves 1 USDT
};

// Transaction send:
// - https://ethereum.stackexchange.com/a/131944
// - https://github.com/ethers-io/ethers.js/issues/183
// https://medium.com/@mehmetegemenalbayrak/send-erc20-tokens-with-javascript-and-ethers-js-a063df896f99

export const populateTransaction = async ({
	contract: { address: contractAddress },
	address,
	amount
}: {
	contract: Erc20ContractAddress;
	address: ECDSA_PUBLIC_KEY;
	amount: BigNumber;
}): Promise<PopulatedTransaction> => {
	const erc20Contract = new ethers.Contract(contractAddress, abiERC20, provider);
	// TODO: transfer?
	return erc20Contract.populateTransaction.approve(address, amount);
};
