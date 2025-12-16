import type { TokenIdentifier, TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { ExtTokenWithoutId } from '$icp/types/ext-token';
import {
	extIndexToIdentifier,
	isTokenExt,
	isTokenExtCustomToken,
	mapExtToken
} from '$icp/utils/ext.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { TokenStandardCode } from '$lib/types/token';
import { mockValidExtV2Token, mockValidExtV2Token2 } from '$tests/mocks/ext-tokens.mock';
import { mockExtV2TokenCanisterId } from '$tests/mocks/ext-v2-token.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

describe('ext.utils', () => {
	describe('isTokenExt', () => {
		it.each(['ext'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenExt({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenExt({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
				).toBeFalsy();
			}
		);
	});

	describe('isTokenExtCustomToken', () => {
		const mockTokens = [mockValidExtV2Token, mockValidExtV2Token2];

		it.each(
			mockTokens.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenExtCustomToken(token)).toBeTruthy();
		});

		it.each(mockTokens)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenExtCustomToken(token)).toBeFalsy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...mockTokens
		])('should return false for token $name', (token) => {
			expect(isTokenExtCustomToken(token)).toBeFalsy();
		});
	});

	describe('extIndexToIdentifier', () => {
		// Real values from https://entrepot.app/
		const testCases: {
			canisterId: CanisterIdText;
			index: TokenIndex;
			expected: TokenIdentifier;
		}[] = [
			{
				canisterId: 'oeee4-qaaaa-aaaak-qaaeq-cai',
				index: 9584,
				expected: 'bcmhj-4qkor-uwiaa-aaaaa-cuaab-eaqca-aaevy-a'
			},
			{
				canisterId: 'oeee4-qaaaa-aaaak-qaaeq-cai',
				index: 1699,
				expected: 'vhvyb-7ikor-uwiaa-aaaaa-cuaab-eaqca-aaa2r-q'
			},
			{
				canisterId: 'bzsui-sqaaa-aaaah-qce2a-cai',
				index: 6441,
				expected: 'dmp7r-kakor-uwiaa-aaaaa-b4arg-qaqca-aadeu-q'
			},
			{
				canisterId: '4vy4g-waaaa-aaaag-qcxpq-cai',
				index: 8861,
				expected: '5s6r5-mikor-uwiaa-aaaaa-buav3-4aqca-aaeko-q'
			}
		];

		it.each(testCases)(
			'should return correct identifier for canisterId $canisterId and index $index',
			({ canisterId, index, expected }) => {
				const collectionId = Principal.fromText(canisterId);

				expect(extIndexToIdentifier({ collectionId, index })).toBe(expected);
			}
		);

		it('should throw an error for negative index', () => {
			const collectionId = Principal.fromText('oeee4-qaaaa-aaaak-qaaeq-cai');
			const index = -1;

			expect(() => extIndexToIdentifier({ collectionId, index })).toThrowError(
				'EXT token index -1 is out of bounds'
			);
		});
	});

	describe('mapExtToken', () => {
		const mockName = 'Mock EXT Token';
		const mockCanisterId = mockExtV2TokenCanisterId;
		const mockParams = { canisterId: mockCanisterId, metadata: { name: mockName } };

		const expected: ExtTokenWithoutId = {
			canisterId: mockCanisterId,
			network: ICP_NETWORK,
			name: mockName,
			symbol: mockName,
			decimals: 0,
			standard: { code: 'ext' },
			category: 'custom'
		};

		it('should correctly map an EXT token', () => {
			expect(mapExtToken(mockParams)).toStrictEqual(expected);
		});

		it('should handle empty string as name', () => {
			expect(
				mapExtToken({ ...mockParams, metadata: { ...mockParams.metadata, name: '' } })
			).toStrictEqual({
				...expected,
				name: '',
				symbol: ''
			});
		});
	});
});
