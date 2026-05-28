import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { isInvalidDestinationBtc, shouldSkipDestinationStep } from '$lib/utils/send.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
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

		it('returns true when destination is a valid BTC mainnet address and the token is on BTC', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockBtcAddress, token: BTC_MAINNET_TOKEN })
			).toBeTruthy();
		});

		it('returns true when destination is a valid principal and the token is on IC', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockPrincipalText, token: ICP_TOKEN })
			).toBeTruthy();
		});

		it('returns false when destination is empty', () => {
			expect(shouldSkipDestinationStep({ destination: '', token: SOLANA_TOKEN })).toBeFalsy();
			expect(shouldSkipDestinationStep({ destination: '', token: BTC_MAINNET_TOKEN })).toBeFalsy();
			expect(shouldSkipDestinationStep({ destination: '', token: ICP_TOKEN })).toBeFalsy();
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

		it('returns false when destination is not a valid BTC address for a BTC token', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress, token: BTC_MAINNET_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockPrincipalText, token: BTC_MAINNET_TOKEN })
			).toBeFalsy();
		});

		it('returns false when destination is not a valid principal for an IC token', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockBtcAddress, token: ICP_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: 'not-a-principal', token: ICP_TOKEN })
			).toBeFalsy();
		});

		it('returns true when destination is a valid EVM address and the token is on Ethereum', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress3, token: ETHEREUM_TOKEN })
			).toBeTruthy();
		});

		it('returns true when destination is a valid EVM address and the token is on a non-Ethereum EVM mainnet', () => {
			// `mockEthAddress3` is a 0x-prefixed 40-hex address with a valid mixed-case
			// checksum, so it satisfies `isEthAddress` regardless of which EVM chain the
			// token lives on. Base is exercised here as a representative non-Ethereum
			// EVM mainnet; the underlying predicate is `isNetworkIdEvm`, which captures
			// every entry in `SUPPORTED_EVM_NETWORK_IDS` (Base / BSC / Polygon / Arbitrum).
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress3, token: BASE_ETH_TOKEN })
			).toBeTruthy();
		});

		it('returns false when destination is the wrong length to be an EVM address', () => {
			// `mockEthAddress` is 64 hex chars (transaction-hash sized) rather than the
			// 40 hex chars of a 20-byte EVM address, so ethers' `isAddress` rejects it.
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress, token: ETHEREUM_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress, token: BASE_ETH_TOKEN })
			).toBeFalsy();
		});

		it('returns false when destination is a non-EVM address but the token is on an EVM network', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockBtcAddress, token: ETHEREUM_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockSolAddress, token: ETHEREUM_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockPrincipalText, token: BASE_ETH_TOKEN })
			).toBeFalsy();
		});

		it('returns false when destination is a valid EVM address but the token is not on an EVM network', () => {
			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress3, token: BTC_MAINNET_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress3, token: ICP_TOKEN })
			).toBeFalsy();

			expect(
				shouldSkipDestinationStep({ destination: mockEthAddress3, token: SOLANA_TOKEN })
			).toBeFalsy();
		});
	});
});
