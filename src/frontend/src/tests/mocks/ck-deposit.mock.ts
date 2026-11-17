import { encodePrincipalToEthAddress } from '@icp-sdk/canisters/cketh';
import type { Principal } from '@icp-sdk/core/principal';
import { Interface } from 'ethers/abi';
import { hexlify, zeroPadValue } from 'ethers/utils';

// The ckETH minter's helper contract that deposits to a principal and a subaccount, on Ethereum mainnet.
export const mockCkDepositHelperContractAddress = '0x18901044688D3756C35Ed2b36D93e6a5B8e00E68';

// Any subaccount other than the default one of zeros.
export const mockCkDepositSubaccount = new Uint8Array(32).fill(7);

// Source: https://etherscan.io/address/0x18901044688D3756C35Ed2b36D93e6a5B8e00E68#code
const ckDepositInterface = new Interface([
	'function depositEth(bytes32 principal, bytes32 subaccount) payable',
	'function depositErc20(address erc20Address, uint256 amount, bytes32 principal, bytes32 subaccount)'
]);

const toSubaccountBytes32 = (subaccount: Uint8Array | undefined): string =>
	zeroPadValue(hexlify(subaccount ?? new Uint8Array(32)), 32);

export const encodeCkDepositEth = ({
	owner,
	subaccount
}: {
	owner: Principal;
	subaccount?: Uint8Array;
}): string =>
	ckDepositInterface.encodeFunctionData('depositEth', [
		encodePrincipalToEthAddress(owner),
		toSubaccountBytes32(subaccount)
	]);

export const encodeCkDepositErc20 = ({
	address,
	amount,
	owner,
	subaccount
}: {
	address: string;
	amount: bigint;
	owner: Principal;
	subaccount?: Uint8Array;
}): string =>
	ckDepositInterface.encodeFunctionData('depositErc20', [
		address,
		amount,
		encodePrincipalToEthAddress(owner),
		toSubaccountBytes32(subaccount)
	]);
