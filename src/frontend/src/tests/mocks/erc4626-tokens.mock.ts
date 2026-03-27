import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import type { NetworkEnvironment } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidErc4626Token: Erc4626Token = {
	...mockValidToken,
	id: parseTokenId('Erc4626TokenId'),
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc4626' },
	address: '0xvaultAddress',
	assetAddress: '0xassetAddress',
	assetDecimals: 6,
	assetSymbol: 'TEST'
};

export const createMockErc4626Tokens = ({
	n,
	networkEnv,
	start = 0
}: {
	n: number;
	networkEnv: NetworkEnvironment;
	start?: number;
}): Erc4626Token[] =>
	Array.from({ length: n }, (_, i) => ({
		...mockValidErc4626Token,
		id: parseTokenId(`Erc4626Token${start + i + 1}-${networkEnv}`),
		symbol: `ERC4626-${start + i + 1}-${networkEnv}`,
		name: `Erc4626Token${start + i + 1} ${networkEnv}`,
		network: networkEnv === 'mainnet' ? ETHEREUM_NETWORK : SEPOLIA_NETWORK,
		address: `0xerc4626-${start + i + 1}-${networkEnv}`,
		assetAddress: `0xasset-${start + i + 1}-${networkEnv}`,
		assetDecimals: 6,
		assetSymbol: `ASSET-${start + i + 1}`
	}));

export const createMockErc4626CustomTokens = ({
	n,
	networkEnv,
	start = 0
}: {
	n: number;
	networkEnv: NetworkEnvironment;
	start?: number;
}): CertifiedData<Erc4626CustomToken>[] =>
	createMockErc4626Tokens({ n, networkEnv, start }).map((token) => ({
		data: { ...token, enabled: true },
		certified: false
	}));
