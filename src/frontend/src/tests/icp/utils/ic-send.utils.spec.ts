import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { IC_CKSOL_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcSendRequest } from '$icp/types/ic-send';
import {
	isInvalidDestinationIc,
	isSameIcSendRequest,
	isTokenCkSolLedger,
	toIcSendRequest
} from '$icp/utils/ic-send.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockPrincipalText, mockPrincipalText2 } from '$tests/mocks/identity.mock';

describe('ic-send.utils', () => {
	describe('isTokenCkSolLedger', () => {
		it('should match the ckSOL ledger', () => {
			expect(isTokenCkSolLedger({ ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID })).toBeTruthy();
		});

		it('should not match another ledger', () => {
			expect(isTokenCkSolLedger(mockValidIcrcToken)).toBeFalsy();
		});

		it('should not match a token without a ledger', () => {
			expect(isTokenCkSolLedger({})).toBeFalsy();
		});
	});

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

	describe('toIcSendRequest', () => {
		const now = new Date('2026-11-06T10:00:00Z');

		const previous: IcSendRequest = {
			tokenId: mockValidIcrcToken.id,
			to: mockPrincipalText,
			amount: 1_000n,
			createdAt: 1_700_000_000_000_000_000n
		};

		const { createdAt: _, ...sameRequest } = previous;

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(now);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('creates a request at the current time when there is no previous one', () => {
			expect(toIcSendRequest({ ...sameRequest, previous: undefined })).toEqual({
				...sameRequest,
				createdAt: BigInt(now.getTime()) * 1_000_000n
			});
		});

		it('keeps the previous request for the same token, destination and amount', () => {
			expect(toIcSendRequest({ ...sameRequest, previous })).toBe(previous);
		});

		it.each([
			{ change: 'token', request: { ...sameRequest, tokenId: ICP_TOKEN.id } },
			{ change: 'destination', request: { ...sameRequest, to: mockPrincipalText2 } },
			{ change: 'amount', request: { ...sameRequest, amount: 2_000n } }
		])('creates a new request when the $change changes', ({ request }) => {
			expect(toIcSendRequest({ ...request, previous })).toEqual({
				...request,
				createdAt: BigInt(now.getTime()) * 1_000_000n
			});
		});
	});

	describe('isSameIcSendRequest', () => {
		const previous: IcSendRequest = {
			tokenId: mockValidIcrcToken.id,
			to: mockPrincipalText,
			amount: 1_000n,
			createdAt: 1_700_000_000_000_000_000n
		};

		const { createdAt: _, ...request } = previous;

		it('is true for the same token, destination and amount', () => {
			expect(isSameIcSendRequest({ previous, request })).toBeTruthy();
		});

		it.each([
			{ change: 'token', changed: { ...request, tokenId: ICP_TOKEN.id } },
			{ change: 'destination', changed: { ...request, to: mockPrincipalText2 } },
			{ change: 'amount', changed: { ...request, amount: 2_000n } }
		])('is false when the $change differs', ({ changed }) => {
			expect(isSameIcSendRequest({ previous, request: changed })).toBeFalsy();
		});
	});
});
