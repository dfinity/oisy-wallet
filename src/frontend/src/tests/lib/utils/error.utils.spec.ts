import { replaceErrorFields, replaceIcErrorFields } from '$lib/utils/error.utils';

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
});
