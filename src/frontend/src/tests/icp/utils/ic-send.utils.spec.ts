import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { isInvalidDestinationIc, isInvalidNat64Memo } from '$icp/utils/ic-send.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';

describe('ic-send.utils', () => {
	describe('isInvalidDestinationIc', () => {
		it.each([
			{
				params: {
					destination: '',
					tokenStandard: BTC_MAINNET_TOKEN.standard
				},
				result: false
			},
			{
				params: {
					destination: mockBtcAddress,
					tokenStandard: BTC_MAINNET_TOKEN.standard,
					networkId: BTC_MAINNET_NETWORK_ID
				},
				result: false
			},
			{
				params: {
					destination: mockBtcAddress,
					tokenStandard: BTC_MAINNET_TOKEN.standard,
					networkId: ETHEREUM_NETWORK_ID
				},
				result: true
			},
			{
				params: {
					destination: mockBtcAddress,
					tokenStandard: BTC_MAINNET_TOKEN.standard
				},
				result: true
			},
			{
				params: {
					destination: mockEthAddress3,
					tokenStandard: ETHEREUM_TOKEN.standard,
					networkId: ETHEREUM_NETWORK_ID
				},
				result: false
			},
			{
				params: {
					destination: mockEthAddress3,
					tokenStandard: ETHEREUM_TOKEN.standard
				},
				result: true
			},
			{
				params: {
					destination: mockEthAddress3,
					tokenStandard: ETHEREUM_TOKEN.standard,
					networkId: BTC_MAINNET_NETWORK_ID
				},
				result: true
			},
			{
				params: {
					destination: mockPrincipalText,
					tokenStandard: ICP_TOKEN.standard
				},
				result: false
			},
			{
				params: {
					destination: mockEthAddress3,
					tokenStandard: ICP_TOKEN.standard
				},
				result: true
			},
			{
				params: {
					destination: mockPrincipalText,
					tokenStandard: mockValidIcrcToken.standard
				},
				result: false
			},
			{
				params: {
					destination: mockPrincipalText,
					tokenStandard: mockValidExtV2Token.standard
				},
				result: false
			},
			{
				params: {
					destination: mockPrincipalText,
					tokenStandard: mockValidIcPunksToken.standard
				},
				result: false
			},
			{
				params: {
					destination: mockBtcAddress,
					tokenStandard: mockValidIcrcToken.standard
				},
				result: true
			},
			{
				params: {
					destination: mockBtcAddress,
					tokenStandard: mockValidExtV2Token.standard
				},
				result: true
			}
		])('returns correct result', ({ params, result }) => {
			expect(isInvalidDestinationIc(params)).toBe(result);
		});
	});

	describe('isInvalidNat64Memo', () => {
		it.each([
			{ memo: '0', expected: false },
			{ memo: '1', expected: false },
			{ memo: '42', expected: false },
			{ memo: '18446744073709551615', expected: false }, // 2^64 - 1
			{ memo: '18446744073709551616', expected: true }, // 2^64, out of range
			{ memo: '-1', expected: true },
			{ memo: '1.5', expected: true },
			{ memo: 'abc', expected: true },
			{ memo: '', expected: true },
			{ memo: '  ', expected: true },
			{ memo: '0x1A', expected: true },
			{ memo: ' 42 ', expected: false } // surrounding whitespace is trimmed
		])('isInvalidNat64Memo("$memo") === $expected', ({ memo, expected }) => {
			expect(isInvalidNat64Memo(memo)).toBe(expected);
		});
	});
});
