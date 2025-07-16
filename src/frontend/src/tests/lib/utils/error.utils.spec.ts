import {
	mapIcErrorMetadata,
	parseIcErrorMessage,
	replaceErrorFields,
	replaceIcErrorFields
} from '$lib/utils/error.utils';

describe('error.utils', () => {
	describe('replaceErrorFields', () => {
		const errorObj = {
			message: 'fail',
			requestId: 'abc123',
			token: 'secret',
			code: 500
		};

		it('returns undefined if input is nullish', () => {
			expect(replaceErrorFields({ err: null, keysToRemove: ['requestId'] })).toBeUndefined();
			expect(replaceErrorFields({ err: undefined, keysToRemove: ['token'] })).toBeUndefined();
		});

		it('removes keys from object error', () => {
			const result = replaceErrorFields({
				err: { ...errorObj },
				keysToRemove: ['token', 'requestId']
			});

			expect(result).toBe(JSON.stringify({ message: 'fail', code: 500 }));
		});

		it('removes keys from stringified JSON', () => {
			const input = JSON.stringify(errorObj);

			const result = replaceErrorFields({
				err: input,
				keysToRemove: ['token', 'requestId']
			});

			expect(result).toBe('{"message":"fail","code":500}');
			expect(result).not.toContain('"token"');
			expect(result).not.toContain('"requestId"');
		});

		it('handles strings without matching keys', () => {
			const input = `{"message": "all good", "code": "200"}`;

			const result = replaceErrorFields({
				err: input,
				keysToRemove: ['nonExistentKey']
			});

			expect(result).toBe(input);
		});

		it('handles string with keys having no comma', () => {
			const input = `
    {
      "message": "fail"
      "requestId": "abc123"
    }
    `;

			const result = replaceErrorFields({
				err: input,
				keysToRemove: ['requestId']
			});

			expect(result).not.toContain('"requestId"');
			expect(result).toContain('"message": "fail"');
		});

		it('removes keys from stringified JSON even if keys have whitespaces', () => {
			const input = `
    {
      "message": "fail"
      " requestId ": "abc123"
    }
    `;

			const result = replaceErrorFields({
				err: input,
				keysToRemove: ['requestId']
			});

			expect(result).not.toContain('"requestId"');
			expect(result).toContain('"message": "fail"');
		});

		it('returns string as-is for number, boolean', () => {
			expect(replaceErrorFields({ err: 123, keysToRemove: [] })).toBe('123');
			expect(replaceErrorFields({ err: true, keysToRemove: [] })).toBe('true');
			expect(replaceErrorFields({ err: false, keysToRemove: [] })).toBe('false');
		});

		it('removes key from Error.message', () => {
			const error = new Error('Test error, Request ID: 123');
			const result = replaceErrorFields({
				err: error,
				keysToRemove: ['Request ID']
			});

			expect(result).toBe('Test error');
		});

		it('removes multiple keys from Error.message', () => {
			const error = new Error('Test error, Request ID: 123, status: failed');
			const result = replaceErrorFields({
				err: error,
				keysToRemove: ['Request ID', 'status']
			});

			expect(result).toBe('Test error');
		});

		it('cleans up dangling commas after removal from Error.message', () => {
			const error = new Error('Test error, Request ID: 123, status: failed');
			const result = replaceErrorFields({
				err: error,
				keysToRemove: ['Request ID']
			});

			expect(result).toBe('Test error, status: failed');
		});

		it('returns Error.message as-is if no matching keys found', () => {
			const error = new Error('Some unknown issue');
			const result = replaceErrorFields({
				err: error,
				keysToRemove: ['token']
			});

			expect(result).toBe('Some unknown issue');
		});
	});

	describe('replaceIcErrorFields', () => {
		const errorObj = {
			message: 'fail',
			'Request ID': 'abc123',
			token: 'secret',
			code: 500
		};

		it('returns undefined if input is nullish', () => {
			expect(replaceIcErrorFields(null)).toBeUndefined();
			expect(replaceIcErrorFields(undefined)).toBeUndefined();
		});

		it('removes keys from object error', () => {
			const result = replaceIcErrorFields(errorObj);

			expect(result).toBe(JSON.stringify({ message: 'fail', token: 'secret', code: 500 }));
		});

		it('removes keys from stringified JSON', () => {
			const input = JSON.stringify(errorObj);

			const result = replaceIcErrorFields(input);

			expect(result).toBe('{"message":"fail","token":"secret","code":500}');
			expect(result).not.toContain('"Request ID"');
		});

		it('handles strings without matching keys', () => {
			const input = `{"message": "all good", "code": "200"}`;

			const result = replaceIcErrorFields(input);

			expect(result).toBe(input);
		});

		it('handles string with keys having no comma', () => {
			const input = `
    {
      "message": "fail"
      "Request ID": "abc123"
    }
    `;

			const result = replaceIcErrorFields(input);

			expect(result).not.toContain('"Request ID"');
			expect(result).toContain('"message": "fail"');
		});

		it('removes keys from stringified JSON even if keys have whitespaces', () => {
			const input = `
    {
      "message": "fail"
      " Request ID ": "abc123"
    }
    `;

			const result = replaceIcErrorFields(input);

			expect(result).not.toContain('"Request ID"');
			expect(result).toContain('"message": "fail"');
		});

		it('removes key from Error.message', () => {
			const error = new Error('Test error, Request ID: 123');
			const result = replaceIcErrorFields(error);

			expect(result).toBe('Test error');
		});

		it('returns Error.message as-is if no matching keys found', () => {
			const error = new Error('Some unknown issue');
			const result = replaceIcErrorFields(error);

			expect(result).toBe('Some unknown issue');
		});
	});

	describe('parseIcErrorMessage', () => {
		it('should return undefined if input is nullish', () => {
			expect(parseIcErrorMessage(null)).toBeUndefined();
			expect(parseIcErrorMessage(undefined)).toBeUndefined();
		});

		it('should return undefined if the input is not an error object', () => {
			expect(
				parseIcErrorMessage({
					message: 'fail',
					requestId: 'abc123',
					token: 'secret',
					code: 500
				})
			).toBeUndefined();

			expect(parseIcErrorMessage('Some string error')).toBeUndefined();

			expect(parseIcErrorMessage(123)).toBeUndefined();

			expect(parseIcErrorMessage(true)).toBeUndefined();

			expect(parseIcErrorMessage(false)).toBeUndefined();

			expect(parseIcErrorMessage({})).toBeUndefined();

			expect(parseIcErrorMessage([])).toBeUndefined();

			expect(parseIcErrorMessage(new Date())).toBeUndefined();
		});

		it('should return undefined if the error message is empty', () => {
			expect(parseIcErrorMessage(new Error(''))).toBeUndefined();
		});

		it('should return a parsed object with a correct error message', () => {
			const errorMsg = `Call failed: \n message: fail\n 'Error code': abc123\n token: secret\n "Reject message": "This is a reject message"\n code: 500`;
			const expected = {
				message: 'fail',
				'Error code': 'abc123',
				token: 'secret',
				'Reject message': 'This is a reject message',
				code: '500'
			};
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toEqual(expected);
		});

		it('should return a parsed object removing the unnecessary keys', () => {
			const errorMsg = `Call failed: \n message: fail\n 'Error code': abc123\n token: secret\n "Request ID": "abc123"\n "Reject message": "This is a reject message"\n code: 500\nConsider gracefully handling failures from this canister or altering the canister to handle exceptions. See documentation: https://internetcomputer.org/docs/current/references/ic-interface-spec/#error-handling`;
			const expected = {
				message: 'fail',
				'Error code': 'abc123',
				token: 'secret',
				'Reject message': 'This is a reject message',
				code: '500'
			};
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toEqual(expected);
		});

		it('should handle missing error details', () => {
			const errorMsg = `Call failed:`;
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toBeUndefined();
		});

		it('should ignore empty error details', () => {
			const errorMsg = `Call failed: \n message: fail\n 'Error code':\n token: secret\n "Reject message": "This is a reject message"\n code: 500`;
			const expected = {
				message: 'fail',
				token: 'secret',
				'Reject message': 'This is a reject message',
				code: '500'
			};
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toEqual(expected);
		});

		it('should ignore empty error keys', () => {
			const errorMsg = `Call failed: \n message: fail\n  : abc123\n token: secret\n "Reject message": "This is a reject message"\n code: 500`;
			const expected = {
				message: 'fail',
				token: 'secret',
				'Reject message': 'This is a reject message',
				code: '500'
			};
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toEqual(expected);
		});
	});

	describe('mapIcErrorMetadata', () => {
		it('should return an empty object if input is nullish', () => {
			expect(mapIcErrorMetadata(null)).toBeUndefined();
			expect(mapIcErrorMetadata(undefined)).toBeUndefined();
		});

		it('should return a parsed object if the input is an error object', () => {
			const errorMsg = `Call failed: \n message: fail\n 'Error code': abc123\n token: secret\n "Reject message": "This is a reject message"\n code: 500`;
			const expected = {
				message: 'fail',
				'Error code': 'abc123',
				token: 'secret',
				'Reject message': 'This is a reject message',
				code: '500'
			};
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toEqual(expected);
		});

		it('removes keys from object error', () => {
			const result = replaceIcErrorFields({
				message: 'fail',
				'Request ID': 'abc123',
				token: 'secret',
				code: 500
			});

			expect(result).toBe(JSON.stringify({ message: 'fail', token: 'secret', code: 500 }));
		});
	});
});
