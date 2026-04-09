import type { SwapSupportedTokensData } from '$lib/stores/swap-supported-tokens.store';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { filterSwapTokens } from '$lib/utils/swap-tokens-filter.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

describe('filterSwapTokens', () => {
	const asToggleable = <T extends Token>(
		token: T,
		enabled: boolean
	): TokenToggleable<T> => ({
		...token,
		enabled
	});

	const CANISTER_ID_INACTIVE = 'uf2wh-taaaa-aaaaq-aabna-cai';
	const CANISTER_ID_UNSUPPORTED = 'utozz-siaaa-aaaam-qaaxq-cai';
	const CANISTER_ID_NOT_IN_SET = 'u45jl-liaaa-aaaam-abppa-cai';

	const icpTokenActive = asToggleable(mockValidIcToken, true);
	const icpTokenInactive = asToggleable(
		{ ...mockValidIcrcToken, ledgerCanisterId: CANISTER_ID_INACTIVE },
		false
	);
	const icpTokenInactiveUnsupported = asToggleable(
		{ ...mockValidIcrcToken, ledgerCanisterId: CANISTER_ID_UNSUPPORTED },
		false
	);

	const erc20Active = asToggleable(mockValidErc20Token, true);
	const erc20Inactive = asToggleable(
		{ ...mockValidErc20Token, address: '0xInactiveAddr' },
		false
	);
	const erc20InactiveUnsupported = asToggleable(
		{ ...mockValidErc20Token, address: '0xUnsupportedAddr' },
		false
	);

	const splActive = asToggleable(mockValidSplToken, true);
	const splInactive = asToggleable(
		{ ...mockValidSplToken, address: 'InactiveSplAddress' },
		false
	);

	describe('when supportedData is undefined', () => {
		it('returns all tokens unchanged', () => {
			const tokens = [icpTokenActive, icpTokenInactive, erc20Active, splActive];
			const result = filterSwapTokens({ tokens, supportedData: undefined });
			expect(result).toEqual(tokens);
		});
	});

	describe('coverage = all', () => {
		it('shows only supported tokens (active or inactive)', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: {
					coverage: 'all',
					supportedTokenIds: new Set([
						icpTokenActive.ledgerCanisterId,
						icpTokenInactive.ledgerCanisterId
					])
				},
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const tokens = [icpTokenActive, icpTokenInactive, icpTokenInactiveUnsupported];
			const result = filterSwapTokens({ tokens, supportedData });

			expect(result).toContain(icpTokenActive);
			expect(result).toContain(icpTokenInactive);
			expect(result).not.toContain(icpTokenInactiveUnsupported);
		});

		it('filters out active tokens not in the supported set', () => {
			const unsupportedActive = asToggleable(
				{ ...mockValidIcrcToken, ledgerCanisterId: CANISTER_ID_NOT_IN_SET },
				true
			);

			const supportedData: SwapSupportedTokensData = {
				icp: {
					coverage: 'all',
					supportedTokenIds: new Set([icpTokenActive.ledgerCanisterId])
				},
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({
				tokens: [icpTokenActive, unsupportedActive],
				supportedData
			});

			expect(result).toContain(icpTokenActive);
			expect(result).not.toContain(unsupportedActive);
		});
	});

	describe('coverage = some', () => {
		it('shows all active tokens plus inactive supported ones', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'some',
					supportedTokenIds: new Set([erc20Inactive.address.toLowerCase()])
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const tokens = [erc20Active, erc20Inactive, erc20InactiveUnsupported];
			const result = filterSwapTokens({ tokens, supportedData });

			expect(result).toContain(erc20Active);
			expect(result).toContain(erc20Inactive);
			expect(result).not.toContain(erc20InactiveUnsupported);
		});

		it('keeps active tokens even when not in supported set', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'some',
					supportedTokenIds: new Set()
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({
				tokens: [erc20Active],
				supportedData
			});

			expect(result).toContain(erc20Active);
		});
	});

	describe('coverage = none', () => {
		it('shows only active tokens', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const tokens = [erc20Active, erc20Inactive, splActive, splInactive];
			const result = filterSwapTokens({ tokens, supportedData });

			expect(result).toContain(erc20Active);
			expect(result).not.toContain(erc20Inactive);
			expect(result).toContain(splActive);
			expect(result).not.toContain(splInactive);
		});
	});

	describe('mixed network categories', () => {
		it('applies the correct rule per network category', () => {
			const supportedData: SwapSupportedTokensData = {
				icp: {
					coverage: 'all',
					supportedTokenIds: new Set([icpTokenActive.ledgerCanisterId])
				},
				evm: {
					coverage: 'some',
					supportedTokenIds: new Set([erc20Inactive.address.toLowerCase()])
				},
				sol: {
					coverage: 'all',
					supportedTokenIds: new Set([splActive.address])
				}
			};

			const tokens = [
				icpTokenActive,
				icpTokenInactive,
				erc20Active,
				erc20Inactive,
				erc20InactiveUnsupported,
				splActive,
				splInactive
			];

			const result = filterSwapTokens({ tokens, supportedData });

			// ICP: all → only supported
			expect(result).toContain(icpTokenActive);
			expect(result).not.toContain(icpTokenInactive);

			// EVM: some → active + supported inactive
			expect(result).toContain(erc20Active);
			expect(result).toContain(erc20Inactive);
			expect(result).not.toContain(erc20InactiveUnsupported);

			// SOL: all → only supported
			expect(result).toContain(splActive);
			expect(result).not.toContain(splInactive);
		});
	});

	describe('EVM token identifier matching', () => {
		it('matches ERC-20 address case-insensitively', () => {
			const token = asToggleable(
				{ ...mockValidErc20Token, address: '0xAbCdEf1234567890' },
				false
			);

			const supportedData: SwapSupportedTokensData = {
				icp: { coverage: 'none', supportedTokenIds: new Set() },
				evm: {
					coverage: 'all',
					supportedTokenIds: new Set(['0xabcdef1234567890'])
				},
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			};

			const result = filterSwapTokens({ tokens: [token], supportedData });
			expect(result).toContain(token);
		});
	});
});
