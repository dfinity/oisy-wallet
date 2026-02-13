import type { ContractAddress, Erc20ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { RequiredToken, Token, TokenStandardCode } from '$lib/types/token';

type Erc4626Standard = Extract<TokenStandardCode, 'erc4626'>;

export type Erc4626Token = Erc4626Contract &
	Omit<Token, 'network' | 'standard'> & {
		network: EthereumNetwork;
		standard: { code: Erc4626Standard; version?: string };
	};

export type RequiredErc4626Token = RequiredToken<Erc4626Token>;

export type Erc4626ContractAddress = Erc20ContractAddress;

export type Erc4626Contract = ContractAddress & {
	assetAddress: Erc20ContractAddress;
	assetDecimals: number;
};

export type Erc4626ContractAddressWithNetwork = Erc20ContractAddressWithNetwork;

export interface Erc4626TokensExchangeData {
	vaultAddress: Erc4626Token['address'];
	vaultDecimals: Erc4626Token['decimals'];
	assetAddress: Erc4626Token['assetAddress'];
	assetDecimals: Erc4626Token['assetDecimals'];
	exchange: Erc4626Token['network']['exchange'];
	infura: Erc4626Token['network']['providers']['infura'];
}
