import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import { TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY } from '$lib/stores/token-action-validation-errors.store';
import {
	mockConvertContext,
	mockConvertContextEntry,
	mockTokenActionValidationErrorsContextEntry
} from '$tests/utils/convert.context.test-utils';
import { get, type Readable } from 'svelte/store';

describe('convert.context.test-utils', () => {
	const convertData = { sourceToken: ICP_TOKEN, destinationToken: ETHEREUM_TOKEN };

	describe('mockConvertContext', () => {
		it('builds a ConvertContext seeded with the provided tokens', () => {
			const context = mockConvertContext(convertData);

			expect(get(context.sourceToken)).toStrictEqual(ICP_TOKEN);
			expect(get(context.destinationToken)).toStrictEqual(ETHEREUM_TOKEN);
		});
	});

	describe('mockConvertContextEntry', () => {
		it('returns an entry keyed by the convert context symbol', () => {
			const [key, value] = mockConvertContextEntry(convertData);

			expect(key).toBe(CONVERT_CONTEXT_KEY);
			expect(get((value as { sourceToken: Readable<unknown> }).sourceToken)).toStrictEqual(
				ICP_TOKEN
			);
		});
	});

	describe('mockTokenActionValidationErrorsContextEntry', () => {
		it('returns an entry keyed by the token-action-validation-errors symbol', () => {
			const [key, value] = mockTokenActionValidationErrorsContextEntry();

			expect(key).toBe(TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY);
			expect(
				get((value as { insufficientFunds: Readable<unknown> }).insufficientFunds)
			).toBeFalsy();
		});
	});
});
