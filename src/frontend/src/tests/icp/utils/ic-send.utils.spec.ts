import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	isInvalidDestinationIc,
	isMobileSendDestination,
	isMobileSendToken
} from '$icp/utils/ic-send.utils';
import { tryToParseIcrcAccountStringToAccountIdentifierText } from '$icp/utils/icp-account.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';

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
});

describe('mobile Send eligibility', () => {
	it('uses ledger and network identity instead of ticker', () => {
		expect(isMobileSendToken(ICP_TOKEN)).toBeTruthy();
		expect(isMobileSendToken({ ...ICP_TOKEN, name: 'Renamed', symbol: 'RENAMED' })).toBeTruthy();

		const counterfeit = { ...ICP_TOKEN, ledgerCanisterId: 'aaaaa-aa' };

		expect(isMobileSendToken(counterfeit)).toBeFalsy();
		expect(isMobileSendToken({ ...ICP_TOKEN, network: ETHEREUM_TOKEN.network })).toBeFalsy();
		expect(isMobileSendToken(ETHEREUM_TOKEN)).toBeFalsy();
		expect(isMobileSendToken(undefined)).toBeFalsy();
	});

	it('rejects equivalent minting-account encodings, including legacy ICP', () => {
		const mint = ICP_TOKEN.mintingAccount;
		const encoded = encodeIcrcAccount(mint);
		const legacy = tryToParseIcrcAccountStringToAccountIdentifierText(encoded);

		expect(legacy).toBeDefined();

		for (const destination of [
			encoded,
			encodeIcrcAccount({ ...mint, subaccount: new Uint8Array(32) }),
			legacy ?? ''
		]) {
			expect(isMobileSendDestination({ token: ICP_TOKEN, destination })).toBeFalsy();
		}
	});

	it('accepts an ordinary ICP account and rejects empty, BTC and ETH recipients', () => {
		expect(
			isMobileSendDestination({ token: ICP_TOKEN, destination: mockPrincipalText })
		).toBeTruthy();

		for (const destination of ['', mockBtcAddress, mockEthAddress3]) {
			expect(isMobileSendDestination({ token: ICP_TOKEN, destination })).toBeFalsy();
		}
	});
});
