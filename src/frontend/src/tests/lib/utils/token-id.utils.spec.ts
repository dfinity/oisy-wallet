import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import type { SplToken } from '$sol/types/spl';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('token-id.utils', () => {
	describe('toBackendTokenId', () => {
		it('maps an ERC-20 token to its address and chain id', () => {
			const token: Erc20Token = {
				...mockValidToken,
				id: parseTokenId(`Erc20-${USDC_ETHEREUM}`),
				standard: { code: 'erc20' },
				address: USDC_ETHEREUM,
				network: ETHEREUM_NETWORK
			};

			expect(toBackendTokenId(token)).toEqual({
				Erc20: [USDC_ETHEREUM, ETHEREUM_NETWORK.chainId]
			});
		});

		it('maps an ERC-4626 vault token to its address and chain id', () => {
			const token: Erc4626Token = {
				...mockValidErc4626Token,
				address: USDC_ETHEREUM,
				network: ETHEREUM_NETWORK
			};

			expect(toBackendTokenId(token)).toEqual({
				Erc4626: [USDC_ETHEREUM, ETHEREUM_NETWORK.chainId]
			});
		});

		it('maps a native EVM coin to its chain id', () => {
			expect(toBackendTokenId(ETHEREUM_TOKEN)).toEqual({ EvmNative: ETHEREUM_NETWORK.chainId });
		});

		it('maps an SPL token by network', () => {
			const mainnet: SplToken = { ...mockValidSplToken, address: USDC_SOLANA };
			const devnet: SplToken = {
				...mockValidSplToken,
				address: USDC_SOLANA,
				network: SOLANA_DEVNET_NETWORK
			};

			expect(toBackendTokenId(mainnet)).toEqual({ SplMainnet: USDC_SOLANA });
			expect(toBackendTokenId(devnet)).toEqual({ SplDevnet: USDC_SOLANA });
		});

		it('maps native Solana by network', () => {
			expect(toBackendTokenId(SOLANA_TOKEN)).toEqual({ SolNativeMainnet: null });
			expect(toBackendTokenId(SOLANA_DEVNET_TOKEN)).toEqual({ SolNativeDevnet: null });
		});

		it('maps an Internet Computer token to its ICRC ledger', () => {
			expect(toBackendTokenId(mockValidIcToken)).toEqual({
				Icrc: Principal.fromText(mockValidIcToken.ledgerCanisterId)
			});
		});

		// ICP has a dedicated `IcpNative` variant, reserved for the exchange-rate
		// path; as an AUT payload it stays addressable by its ledger like any ICRC.
		it('maps ICP itself to its ledger rather than IcpNative', () => {
			expect(toBackendTokenId(ICP_TOKEN)).toEqual({
				Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId)
			});
		});

		it('maps native Bitcoin by network', () => {
			expect(toBackendTokenId(BTC_MAINNET_TOKEN)).toEqual({ BtcNativeMainnet: null });
			expect(toBackendTokenId(BTC_TESTNET_TOKEN)).toEqual({ BtcNativeTestnet: null });
		});

		// Bitcoin regtest is a local-development network with no `TokenId` variant
		// on the backend, so it must stay untrackable rather than borrow testnet's.
		it('returns undefined for a token with no backend representation', () => {
			expect(toBackendTokenId(BTC_REGTEST_TOKEN)).toBeUndefined();
		});
	});
});
