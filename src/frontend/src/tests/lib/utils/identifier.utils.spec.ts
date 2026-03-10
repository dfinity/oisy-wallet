import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { getTokenIdentifier } from '$lib/utils/identifier.utils';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import {
	mockValidDip20Token,
	mockValidIcCkToken,
	mockValidIcrcToken,
	mockValidIcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

vi.mock('$lib/stores/toasts.store', () => ({
	toastsError: vi.fn(),
	toastsShow: vi.fn()
}));

describe('identifier.utils', () => {
	describe('getTokenIdentifier', () => {
		it('should return the address for ERC20 tokens', () => {
			expect(getTokenIdentifier(mockValidErc20Token)).toBe(mockValidErc20Token.address);
		});

		it('should return the address for ERC721 tokens', () => {
			expect(getTokenIdentifier(mockValidErc721Token)).toBe(mockValidErc721Token.address);
		});

		it('should return the address for ERC1155 tokens', () => {
			expect(getTokenIdentifier(mockValidErc1155Token)).toBe(mockValidErc1155Token.address);
		});

		it('should return the address for ERC4626 tokens', () => {
			expect(getTokenIdentifier(mockValidErc4626Token)).toBe(mockValidErc4626Token.address);
		});

		it('should return the address for SPL tokens', () => {
			expect(getTokenIdentifier(mockValidSplToken)).toBe(mockValidSplToken.address);
		});

		it('should return the ledgerCanisterId for IC tokens', () => {
			const tokens = [
				mockValidIcToken,
				mockValidIcrcToken,
				mockValidDip20Token,
				mockValidIcCkToken
			];

			tokens.forEach((token) => {
				expect(getTokenIdentifier(token)).toBe(token.ledgerCanisterId);
			});
		});

		it('should return the ledgerCanisterId for ICP token', () => {
			expect(getTokenIdentifier(ICP_TOKEN)).toBe(ICP_TOKEN.ledgerCanisterId);
		});

		it('should return the canisterId for IC NFT tokens', () => {
			const tokens = [mockValidExtV2Token, mockValidDip721Token, mockValidIcPunksToken];

			tokens.forEach((token) => {
				expect(getTokenIdentifier(token)).toBe(token.canisterId);
			});
		});

		it('should return undefined for native tokens without a contract address', () => {
			expect(getTokenIdentifier(BTC_MAINNET_TOKEN)).toBeUndefined();
			expect(getTokenIdentifier(ETHEREUM_TOKEN)).toBeUndefined();
			expect(getTokenIdentifier(SOLANA_TOKEN)).toBeUndefined();
		});
	});
});
