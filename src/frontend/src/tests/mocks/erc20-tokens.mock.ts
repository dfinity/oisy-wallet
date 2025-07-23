import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { NetworkEnvironment } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidErc20Token: Erc20Token = {
	...mockValidToken,
	id: parseTokenId('Erc20TokenId'),
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	address: mockEthAddress,
	exchange: 'erc20'
};

export const createMockErc20Tokens = ({
	n,
	networkEnv,
	start = 0
}: {
	n: number;
	networkEnv: NetworkEnvironment;
	start?: number;
}): Erc20Token[] =>
	Array.from({ length: n }, (_, i) => ({
		id: parseTokenId(`Erc20Token${start + i + 1}-${networkEnv}`),
		symbol: `ERC20-${start + i + 1}-${networkEnv}`,
		name: `Erc20Token${start + i + 1} ${networkEnv}`,
		network: networkEnv === 'mainnet' ? ETHEREUM_NETWORK : SEPOLIA_NETWORK,
		standard: 'erc20',
		category: 'default',
		decimals: 8,
		address: `0x${start + i + 1}-${networkEnv}`,
		exchange: 'erc20'
	}));

export const createMockErc20UserTokens = ({
	n,
	networkEnv,
	start = 0
}: {
	n: number;
	networkEnv: NetworkEnvironment;
	start?: number;
}): CertifiedData<Erc20UserToken>[] =>
	createMockErc20Tokens({ n, networkEnv, start }).map((token) => ({
		data: { ...token, enabled: true },
		certified: false
	}));

export const createMockErc20CustomTokens = ({
	n,
	networkEnv,
	start = 0
}: {
	n: number;
	networkEnv: NetworkEnvironment;
	start?: number;
}): CertifiedData<Erc20CustomToken>[] =>
	createMockErc20Tokens({ n, networkEnv, start }).map((token) => ({
		data: { ...token, enabled: true },
		certified: false
	}));
