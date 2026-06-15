import {
	CONVERT_CONTEXT_KEY,
	initConvertContext,
	type ConvertContext,
	type ConvertData
} from '$lib/stores/convert.store';
import {
	initTokenActionValidationErrorsContext,
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY
} from '$lib/stores/token-action-validation-errors.store';
import type { MockContextEntry } from '$tests/utils/context.test-utils';

export const mockConvertContext = (convertData: ConvertData): ConvertContext =>
	initConvertContext(convertData);

export const mockConvertContextEntry = (convertData: ConvertData): MockContextEntry => [
	CONVERT_CONTEXT_KEY,
	mockConvertContext(convertData)
];

export const mockTokenActionValidationErrorsContextEntry = (
	initialData?: Parameters<typeof initTokenActionValidationErrorsContext>[0]
): MockContextEntry => [
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
	initTokenActionValidationErrorsContext(initialData)
];
