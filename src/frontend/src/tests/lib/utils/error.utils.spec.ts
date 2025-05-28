import { replaceErrorFields } from '$lib/utils/error.utils';

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
});
