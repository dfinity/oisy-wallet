import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import {
	computeReceiveAmount,
	ICP_LEDGER_TO_TOKEN,
	oneSecCompatibleDestinations,
	oneSecEvmSupportedTokens,
	oneSecIcpSupportedTokens
} from '$lib/utils/onesec-swap.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

// Real values from onesec-bridge DEFAULT_CONFIG
const USDC_LEDGER = '53nhb-haaaa-aaaar-qbn5q-cai';
const USDT_LEDGER = 'ij33n-oiaaa-aaaar-qbooa-cai';
const CBBTC_LEDGER = 'io25z-dqaaa-aaaar-qbooq-cai';
const ICP_LEDGER = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDT_ETHEREUM = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const ICP_ETHEREUM = '0x00f3C42833C3170159af4E92dbb451Fb3F708917';

let mockEnabled = true;

vi.mock('$env/rest/onesec.env', () => ({
	get ONESEC_SWAP_ENABLED() {
		return mockEnabled;
	}
}));

const makeIcToken = (ledgerCanisterId: string): IcToken => ({
	...mockValidIcToken,
	ledgerCanisterId
});

const makeErc20Token = ({
	address,
	network = ETHEREUM_NETWORK
}: {
	address: string;
	network?: Erc20Token['network'];
}): Erc20Token => ({
	...mockValidToken,
	id: parseTokenId(`Erc20-${address}`),
	standard: { code: 'erc20' },
	address,
	network
});

describe('onesec-swap.utils', () => {
	beforeEach(() => {
		mockEnabled = true;
	});

	describe('ICP_LEDGER_TO_TOKEN', () => {
		it('contains entries for all tokens that have a ledger canister', () => {
			expect(ICP_LEDGER_TO_TOKEN[USDC_LEDGER]).toBeDefined();
			expect(ICP_LEDGER_TO_TOKEN[USDT_LEDGER]).toBeDefined();
			expect(ICP_LEDGER_TO_TOKEN[ICP_LEDGER]).toBeDefined();
		});

		it('maps ledger canister IDs to the correct token name', () => {
			expect(ICP_LEDGER_TO_TOKEN[USDC_LEDGER].token).toBe('USDC');
			expect(ICP_LEDGER_TO_TOKEN[USDT_LEDGER].token).toBe('USDT');
			expect(ICP_LEDGER_TO_TOKEN[ICP_LEDGER].token).toBe('ICP');
		});
	});

	describe('computeReceiveAmount', () => {
		it('subtracts transfer and protocol fees from amount', () => {
			// 1 USDC (6 decimals): 0.1% protocol fee + 1000 units transfer fee
			const result = computeReceiveAmount({
				amount: 1_000_000n,
				transferFeeInUnits: 1_000n,
				protocolFeeInPercent: 0.1,
				decimals: 6
			});

			// protocol fee = ceil(1.0 * 0.001 * 1e6) = 1000
			// total fee = 1000 + 1000 = 2000
			expect(result).toBe(998_000n);
		});

		it('returns ZERO when total fee exceeds amount', () => {
			const result = computeReceiveAmount({
				amount: 100n,
				transferFeeInUnits: 200n,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(ZERO);
		});

		it('returns full amount when all fees are zero', () => {
			const result = computeReceiveAmount({
				amount: 5_000_000n,
				transferFeeInUnits: ZERO,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(5_000_000n);
		});

		it('applies only transfer fee when protocol fee is zero', () => {
			const result = computeReceiveAmount({
				amount: 1_000_000n,
				transferFeeInUnits: 500n,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(999_500n);
		});

		it('applies only protocol fee when transfer fee is zero', () => {
			// 0.5% of 1_000_000 = 5000
			const result = computeReceiveAmount({
				amount: 1_000_000n,
				transferFeeInUnits: ZERO,
				protocolFeeInPercent: 0.5,
				decimals: 6
			});

			expect(result).toBe(995_000n);
		});

		it('returns ZERO rather than a negative when fee equals amount exactly', () => {
			const result = computeReceiveAmount({
				amount: 1_000n,
				transferFeeInUnits: 1_000n,
				protocolFeeInPercent: 0,
				decimals: 6
			});

			expect(result).toBe(ZERO);
		});
	});

	describe('oneSecIcpSupportedTokens', () => {
		it('returns ledger canister IDs only for USDC, USDT and cbBTC', async () => {
			const result = await oneSecIcpSupportedTokens();

			expect(result).toEqual(new Set([USDC_LEDGER, USDT_LEDGER, CBBTC_LEDGER]));
		});

		it('excludes ICP and other tokens not in the enabled set', async () => {
			const result = await oneSecIcpSupportedTokens();

			expect(result.has(ICP_LEDGER)).toBeFalsy();
		});

		it('contains no empty strings', async () => {
			const result = await oneSecIcpSupportedTokens();

			expect(result.has('')).toBeFalsy();
		});
	});

	describe('oneSecEvmSupportedTokens', () => {
		it('returns lowercased ERC20 addresses for Ethereum', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [ETHEREUM_NETWORK.id] });

			expect(result).toContain(USDC_ETHEREUM.toLowerCase());
			expect(result).toContain(USDT_ETHEREUM.toLowerCase());
		});

		it('returns Arbitrum-specific address for USDC on Arbitrum', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [ARBITRUM_MAINNET_NETWORK.id] });

			expect(result).toContain(USDC_ARBITRUM.toLowerCase());
			expect(result).not.toContain(USDC_ETHEREUM.toLowerCase());
		});

		it('returns Base-specific address for USDC on Base', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [BASE_NETWORK.id] });

			expect(result).toContain(USDC_BASE.toLowerCase());
			expect(result).not.toContain(USDC_ETHEREUM.toLowerCase());
		});

		it('unions addresses across multiple networks', async () => {
			const result = await oneSecEvmSupportedTokens({
				networkIds: [ETHEREUM_NETWORK.id, ARBITRUM_MAINNET_NETWORK.id, BASE_NETWORK.id]
			});

			expect(result).toContain(USDC_ETHEREUM.toLowerCase());
			expect(result).toContain(USDC_ARBITRUM.toLowerCase());
			expect(result).toContain(USDC_BASE.toLowerCase());
		});

		it('returns empty set for empty network list', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [] });

			expect(result.size).toBe(0);
		});

		it('stores addresses in lowercase', async () => {
			const result = await oneSecEvmSupportedTokens({ networkIds: [ETHEREUM_NETWORK.id] });
			for (const address of result) {
				expect(address).toBe(address.toLowerCase());
			}
		});
	});

	describe('oneSecCompatibleDestinations', () => {
		it('returns undefined when ONESEC_SWAP_ENABLED is false', () => {
			mockEnabled = false;
			const result = oneSecCompatibleDestinations({
				sourceToken: makeIcToken(USDC_LEDGER),
				networkIds: [ETHEREUM_NETWORK.id]
			});

			expect(result).toBeUndefined();
		});

		describe('ICP source token', () => {
			it('returns EVM addresses when source is a supported ICP token', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.evm).toBeDefined();
				expect(result?.evm).toContain(USDC_ETHEREUM.toLowerCase());
			});

			it('includes addresses for all requested networks', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id, ARBITRUM_MAINNET_NETWORK.id, BASE_NETWORK.id]
				});

				expect(result?.evm).toContain(USDC_ETHEREUM.toLowerCase());
				expect(result?.evm).toContain(USDC_ARBITRUM.toLowerCase());
				expect(result?.evm).toContain(USDC_BASE.toLowerCase());
			});

			it('returns undefined for a supported ICP token with no EVM address on the requested network', () => {
				// USDT only has erc20MainnetEthereum — no Arbitrum address, so Arbitrum lookup returns undefined
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDT_LEDGER),
					networkIds: [ARBITRUM_MAINNET_NETWORK.id]
				});

				expect(result).toBeUndefined();
			});

			it('returns the ICP EVM address when source is ICP token on Ethereum', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(ICP_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.evm).toBeDefined();
				expect(result?.evm).toContain(ICP_ETHEREUM.toLowerCase());
			});

			it('returns undefined for an unknown ICP ledger canister', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken('unknown-canister-id'),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result).toBeUndefined();
			});

			it('returns undefined when networkIds is empty', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: []
				});

				expect(result).toBeUndefined();
			});

			it('does not set evm key for icp or sol', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeIcToken(USDC_LEDGER),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toBeUndefined();
				expect(result?.sol).toBeUndefined();
			});
		});

		describe('EVM source token', () => {
			it('returns the matching ICP ledger for a known EVM address', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: USDC_ETHEREUM }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toBeDefined();
				expect(result?.icp).toContain(USDC_LEDGER);
				expect(result?.icp?.size).toBe(1);
			});

			it('is case-insensitive when matching the source EVM address', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: USDC_ETHEREUM.toLowerCase() }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toContain(USDC_LEDGER);
			});

			it('returns empty icp set for an unknown EVM address', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: '0x0000000000000000000000000000000000000001' }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.icp).toBeDefined();
				expect(result?.icp?.size).toBe(0);
			});

			it('returns empty icp set for USDT on Arbitrum (no Arbitrum address in OneSec config)', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({
						address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
						network: ARBITRUM_MAINNET_NETWORK
					}),
					networkIds: [ARBITRUM_MAINNET_NETWORK.id]
				});

				expect(result?.icp).toBeDefined();
				expect(result?.icp?.size).toBe(0);
			});

			it('does not set evm or sol keys for EVM source', () => {
				const result = oneSecCompatibleDestinations({
					sourceToken: makeErc20Token({ address: USDC_ETHEREUM }),
					networkIds: [ETHEREUM_NETWORK.id]
				});

				expect(result?.evm).toBeUndefined();
				expect(result?.sol).toBeUndefined();
			});
		});
	});
});
