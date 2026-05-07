import { SwapProvider, type FindProviderSourceTokens } from '$lib/types/swap';
import { buildNearIntentsSupportedDestinations } from '$lib/utils/near-intents-swap.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

describe('buildNearIntentsSupportedDestinations', () => {
	const evmId = mockValidErc20Token.address.toLowerCase();
	const solId = mockValidSplToken.address;

	const noLookup: FindProviderSourceTokens = () => undefined;

	describe('category = evm', () => {
		const evmFn = buildNearIntentsSupportedDestinations('evm');

		it('returns undefined when source token category does not match (ICP source)', () => {
			const result = evmFn({
				sourceToken: mockValidIcToken,
				supportedSourceTokens: new Set([evmId]),
				findProviderSourceTokens: noLookup
			});

			expect(result).toBeUndefined();
		});

		it('returns undefined when source token category does not match (SOL source)', () => {
			const result = evmFn({
				sourceToken: mockValidSplToken,
				supportedSourceTokens: new Set([evmId]),
				findProviderSourceTokens: noLookup
			});

			expect(result).toBeUndefined();
		});

		it('returns undefined when source identifier is not in supportedSourceTokens', () => {
			const result = evmFn({
				sourceToken: mockValidErc20Token,
				supportedSourceTokens: new Set(['0xother']),
				findProviderSourceTokens: noLookup
			});

			expect(result).toBeUndefined();
		});

		it('returns undefined when supportedSourceTokens is undefined', () => {
			const result = evmFn({
				sourceToken: mockValidErc20Token,
				supportedSourceTokens: undefined,
				findProviderSourceTokens: noLookup
			});

			expect(result).toBeUndefined();
		});

		it('returns the supported set as evm and looks up sibling sol set', () => {
			const supportedSourceTokens = new Set([evmId]);
			const sisterSol = new Set([solId]);

			const findProviderSourceTokens: FindProviderSourceTokens = ({ key, category }) =>
				key === SwapProvider.NEAR_INTENTS && category === 'sol' ? sisterSol : undefined;

			const result = evmFn({
				sourceToken: mockValidErc20Token,
				supportedSourceTokens,
				findProviderSourceTokens
			});

			expect(result).toEqual({ evm: supportedSourceTokens, sol: sisterSol });
		});

		it('omits sol when sibling lookup returns undefined', () => {
			const supportedSourceTokens = new Set([evmId]);

			const result = evmFn({
				sourceToken: mockValidErc20Token,
				supportedSourceTokens,
				findProviderSourceTokens: noLookup
			});

			expect(result).toEqual({ evm: supportedSourceTokens });
		});
	});

	describe('category = sol', () => {
		const solFn = buildNearIntentsSupportedDestinations('sol');

		it('returns undefined when source token category does not match (ICP source)', () => {
			const result = solFn({
				sourceToken: mockValidIcToken,
				supportedSourceTokens: new Set([solId]),
				findProviderSourceTokens: noLookup
			});

			expect(result).toBeUndefined();
		});

		it('returns undefined when source token category does not match (EVM source)', () => {
			const result = solFn({
				sourceToken: mockValidErc20Token,
				supportedSourceTokens: new Set([solId]),
				findProviderSourceTokens: noLookup
			});

			expect(result).toBeUndefined();
		});

		it('returns undefined when source identifier is not in supportedSourceTokens', () => {
			const result = solFn({
				sourceToken: mockValidSplToken,
				supportedSourceTokens: new Set(['OtherSplAddress']),
				findProviderSourceTokens: noLookup
			});

			expect(result).toBeUndefined();
		});

		it('returns the supported set as sol and looks up sibling evm set', () => {
			const supportedSourceTokens = new Set([solId]);
			const sisterEvm = new Set([evmId]);

			const findProviderSourceTokens: FindProviderSourceTokens = ({ key, category }) =>
				key === SwapProvider.NEAR_INTENTS && category === 'evm' ? sisterEvm : undefined;

			const result = solFn({
				sourceToken: mockValidSplToken,
				supportedSourceTokens,
				findProviderSourceTokens
			});

			expect(result).toEqual({ sol: supportedSourceTokens, evm: sisterEvm });
		});

		it('omits evm when sibling lookup returns undefined', () => {
			const supportedSourceTokens = new Set([solId]);

			const result = solFn({
				sourceToken: mockValidSplToken,
				supportedSourceTokens,
				findProviderSourceTokens: noLookup
			});

			expect(result).toEqual({ sol: supportedSourceTokens });
		});

		it('only queries the NEAR Intents sibling, ignoring other providers', () => {
			const supportedSourceTokens = new Set([solId]);
			const wrongProviderSet = new Set(['ignored']);

			const findProviderSourceTokens: FindProviderSourceTokens = ({ key, category }) =>
				key === SwapProvider.NEAR_INTENTS && category === 'evm' ? undefined : wrongProviderSet;

			const result = solFn({
				sourceToken: mockValidSplToken,
				supportedSourceTokens,
				findProviderSourceTokens
			});

			expect(result).toEqual({ sol: supportedSourceTokens });
		});
	});
});
