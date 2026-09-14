import type { TokenId } from '$declarations/backend/backend.did';
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
import { toBackendTokenId, tokenIdKey } from '$lib/utils/token-id.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import type { SplToken } from '$sol/types/spl';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipal, mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('token-id.utils', () => {
	describe('tokenIdKey', () => {
		it.each<{ name: string; id: TokenId; expected: string }>([
			{ name: 'Icrc', id: { Icrc: mockPrincipal }, expected: `Icrc:${mockPrincipalText}` },
			{
				name: 'Erc20',
				id: { Erc20: [USDC_ETHEREUM, 1n] },
				expected: `Erc20:${USDC_ETHEREUM.toLowerCase()}:1`
			},
			{
				name: 'SplMainnet',
				id: { SplMainnet: USDC_SOLANA },
				expected: `SplMainnet:${USDC_SOLANA}`
			},
			{ name: 'EvmNative', id: { EvmNative: 8453n }, expected: 'EvmNative:8453' },
			{ name: 'BtcNativeMainnet', id: { BtcNativeMainnet: null }, expected: 'BtcNativeMainnet' },
			{ name: 'IcpNative', id: { IcpNative: null }, expected: 'IcpNative' },
			{ name: 'SolNativeMainnet', id: { SolNativeMainnet: null }, expected: 'SolNativeMainnet' },
			{ name: 'XrpNativeMainnet', id: { XrpNativeMainnet: null }, expected: 'XrpNativeMainnet' }
		])('serializes $name to a stable key', ({ id, expected }) => {
			expect(tokenIdKey(id)).toBe(expected);
		});

		// A variant without a key is a silent opt-out of exchange-rate caching, not an
		// error — so each one has to be pinned, or a dropped `if` would go unnoticed.
		it.each<{ name: string; id: TokenId }>([
			{ name: 'ExtV2', id: { ExtV2: mockPrincipal } },
			{ name: 'SolNativeDevnet', id: { SolNativeDevnet: null } },
			{ name: 'Erc721', id: { Erc721: [USDC_ETHEREUM, 1n] } },
			{ name: 'SplDevnet', id: { SplDevnet: USDC_SOLANA } },
			{ name: 'IcPunks', id: { IcPunks: mockPrincipal } },
			{ name: 'BtcNativeTestnet', id: { BtcNativeTestnet: null } },
			{ name: 'Erc1155', id: { Erc1155: [USDC_ETHEREUM, 1n] } },
			{ name: 'Erc4626', id: { Erc4626: [USDC_ETHEREUM, 1n] } },
			{ name: 'Dip721', id: { Dip721: mockPrincipal } },
			{ name: 'Icrc7', id: { Icrc7: mockPrincipal } }
		])('returns undefined for the unsupported variant $name', ({ id }) => {
			expect(tokenIdKey(id)).toBeUndefined();
		});

		// The reason this helper exists: the backend hands back freshly deserialized
		// `TokenId` objects, so the key must depend on the value, never on identity.
		it('returns the same key for value-equal but distinct objects', () => {
			expect(tokenIdKey({ XrpNativeMainnet: null })).toBe(tokenIdKey({ XrpNativeMainnet: null }));
			expect(tokenIdKey({ Icrc: mockPrincipal })).toBe(
				tokenIdKey({ Icrc: Principal.fromText(mockPrincipalText) })
			);
		});

		it('throws for a variant it does not know', () => {
			expect(() => tokenIdKey({ Unknown: null } as unknown as TokenId)).toThrow();
		});
	});

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
