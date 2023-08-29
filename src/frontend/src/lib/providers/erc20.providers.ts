import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { Erc20ContractAddress, Erc20Metadata, Erc20Token } from '$lib/types/erc20';
import { InfuraProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const NETWORK = import.meta.env.VITE_INFURA_NETWORK;

const provider = new InfuraProvider(NETWORK, API_KEY);

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

// Transaction send: https://ethereum.stackexchange.com/a/131944

export const transactions = async ({
	address,
	contract
}: {
	address: ECDSA_PUBLIC_KEY;
	contract: Erc20Token;
}) => {
	const erc20Contract = new ethers.Contract(contract.address, abiERC20, provider);

	// TODO: fetch from and to, merge and sort

	// https://github.com/ethers-io/ethers.js/discussions/2029#discussioncomment-1342944
	const filterAddressTo = erc20Contract.filters.Transfer(null, address);

	const ctrResults = await erc20Contract.queryFilter(filterAddressTo, 0, 'latest');
	console.log('ERC20 transactions', ctrResults);
};
