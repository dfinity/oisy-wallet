import type { FindProviderSourceTokens } from '$lib/types/swap';
import { buildSymmetricSupportedDestinations } from '$lib/utils/swap-providers.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

const noopFindProviderSourceTokens: FindProviderSourceTokens = () => undefined;

describe('buildSymmetricSupportedDestinations', () => {
	const icpHandler = buildSymmetricSupportedDestinations('icp');
	const evmHandler = buildSymmetricSupportedDestinations('evm');
	const solHandler = buildSymmetricSupportedDestinations('sol');

	it('returns undefined when source category does not match the provider category', () => {
		const result = icpHandler({
			sourceToken: mockValidErc20Token,
			supportedSourceTokens: new Set([mockValidIcToken.ledgerCanisterId]),
			findProviderSourceTokens: noopFindProviderSourceTokens
		});

		expect(result).toBeUndefined();
	});

	it('returns the supported set under the provider category when source is in the set', () => {
		const supported = new Set([mockValidIcToken.ledgerCanisterId, 'other-canister']);
		const result = icpHandler({
			sourceToken: mockValidIcToken,
			supportedSourceTokens: supported,
			findProviderSourceTokens: noopFindProviderSourceTokens
		});

		expect(result).toEqual({ icp: supported });
	});

	it('returns undefined when source is not in the provider supported set', () => {
		const result = icpHandler({
			sourceToken: mockValidIcToken,
			supportedSourceTokens: new Set(['other-canister']),
			findProviderSourceTokens: noopFindProviderSourceTokens
		});

		expect(result).toBeUndefined();
	});

	it('returns an empty wildcard map when provider has no supported list (e.g. Velora)', () => {
		const result = evmHandler({
			sourceToken: mockValidErc20Token,
			supportedSourceTokens: undefined,
			findProviderSourceTokens: noopFindProviderSourceTokens
		});

		expect(result).toEqual({});
	});

	it('matches EVM addresses case-insensitively', () => {
		const upperToken = { ...mockValidErc20Token, address: '0xABCDEF1234' };
		const supported = new Set(['0xabcdef1234']);

		const result = evmHandler({
			sourceToken: upperToken,
			supportedSourceTokens: supported,
			findProviderSourceTokens: noopFindProviderSourceTokens
		});

		expect(result).toEqual({ evm: supported });
	});

	it('handles SPL tokens by address', () => {
		const supported = new Set([mockValidSplToken.address]);

		const result = solHandler({
			sourceToken: mockValidSplToken,
			supportedSourceTokens: supported,
			findProviderSourceTokens: noopFindProviderSourceTokens
		});

		expect(result).toEqual({ sol: supported });
	});
});
