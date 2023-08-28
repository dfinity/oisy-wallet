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

export const testUSDC = async (address: string) => {
	const USDTContract = new ethers.Contract(
		// Testnets: https://developers.circle.com/developer/docs/usdc-on-testnet
		// Sepolia address https://sepolia.etherscan.io/token/0x40d348b2601a2c5504a29aeac9d072f4ec7d78b7
		'0x40d348b2601A2c5504a29AeAc9d072f4eC7d78b7',
		abiERC20,
		provider
	);
	console.log(
		await USDTContract.balanceOf('0x66d20c6Aa53e7F2B1BDb539f12BeD20EAaCDa79F'),
		await USDTContract.totalSupply()
	);

	// https://github.com/ethers-io/ethers.js/discussions/2029#discussioncomment-1342944
	const filterAddressTo = USDTContract.filters.Transfer(
		null,
		'0x66d20c6Aa53e7F2B1BDb539f12BeD20EAaCDa79F'
	);
	// const ctrResults = await USDTContract.queryFilter(filterAddressTo, -100000, 'latest');

	// console.log(ctrResults);
};
