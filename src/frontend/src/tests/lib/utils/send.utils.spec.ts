import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { isInvalidDestinationBtc, shouldSkipDestinationStep } from '$lib/utils/send.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('send.utils', () => {
	describe('isInvalidDestinationBtc', () => {
		it('should return true if network and destination match', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_TESTNET_NETWORK_ID })
			).toBeTruthy();
		});

		it('should return false if network and destination do not match', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_MAINNET_NETWORK_ID })
			).toBeFalsy();
		});

		it('should return false if destination is empty', () => {
			expect(
				isInvalidDestinationBtc({ destination: '', networkId: BTC_MAINNET_NETWORK_ID })
			).toBeFalsy();
		});

		it('should use Regtest network when networkId is BTC_REGTEST_NETWORK_ID', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_REGTEST_NETWORK_ID })
			).toBeTruthy();
		});

		it('should use Mainnet when networkId is undefined', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: undefined })
			).toBeFalsy();
		});
	});

	describe('shouldSkipDestinationStep', () => {
		it('returns true when destination is a valid Sol address and the token is on Solana', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockSolAddress, token: SOLANA_TOKEN })
			).toBeTruthy();
		});

		it('returns false when destination is empty', () => {
			expect(shouldSkipDestinationStep({ destination: '', token: SOLANA_TOKEN })).toBeFalsy();
		});

		it('returns false when the chosen token is not on a Solana network', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockSolAddress, token: BTC_MAINNET_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockSolAddress, token: ETHEREUM_TOKEN })
			).toBeFalsy();
		});

		it('returns false when destination is not a valid Sol address', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress, token: SOLANA_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: 'not-an-address', token: SOLANA_TOKEN })
			).toBeFalsy();
		});
	});
});
