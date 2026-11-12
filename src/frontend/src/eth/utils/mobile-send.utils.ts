import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import type { OptionToken } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { isAddress } from 'ethers/address';
import { ZeroAddress } from 'ethers/constants';

export const mobileEthSendNetwork = (token: OptionToken): EthereumNetwork | undefined =>
	[...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
		({ id }) => id === token?.network.id
	);

const nativeTokens = [...SUPPORTED_ETHEREUM_TOKENS, ...SUPPORTED_EVM_TOKENS];

// A supported network and an actual fungible contract are required. Vault shares and NFTs use
// different flows, even when their contract addresses are valid Ethereum addresses.
export const isMobileEthSendToken = (token: OptionToken): boolean =>
	nonNullish(token) &&
	nonNullish(mobileEthSendNetwork(token)) &&
	((token.standard.code === 'ethereum' &&
		nativeTokens.some(({ id, network }) => id === token.id && network.id === token.network.id)) ||
		(isTokenErc20(token) &&
			!nativeTokens.some(({ id }) => id === token.id) &&
			isAddress(token.address) &&
			token.address !== ZeroAddress));

export const isMobileEthSendDestination = ({
	token,
	destination,
	minterInfo
}: {
	token: OptionToken;
	destination: string;
	minterInfo?: OptionCertifiedMinterInfo;
}): boolean =>
	isMobileEthSendToken(token) &&
	isAddress(destination) &&
	destination.toLowerCase() !== ZeroAddress &&
	![toCkEthHelperContractAddress(minterInfo), toCkErc20HelperContractAddress(minterInfo)].some(
		(address) => address?.toLowerCase() === destination.toLowerCase()
	);
