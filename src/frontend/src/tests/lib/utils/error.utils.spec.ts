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

			expect(result).toStrictEqual(expected);
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

			expect(result).toStrictEqual(expected);
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

			expect(result).toStrictEqual(expected);
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

			expect(result).toStrictEqual(expected);
		});

		it('should return a parsed object if the input is an error object with HTTP details', () => {
			const errorMsg = `Error while loading the transactions.: Error: The replica returned a rejection error:
  Request ID: 5ccaf5e3b315a16f3b1721226387040edd2660a049cbdcedc4c82a735d1b6c1a
  Reject code: 2
  Reject text: Canister 72uqs-pqaaa-aaaak-aes7a-cai is out of cycles
  Error code: IC0207

Call context:
  Canister ID: 72uqs-pqaaa-aaaak-aes7a-cai
  Method name: get_account_transactions
  HTTP details: {
  "ok": true,
  "status": 200,
  "statusText": "",
  "headers": [
    [
      "content-length",
      "1478"
    ],
    [
      "content-type",
      "application/cbor"
    ],
    [
      "x-ic-canister-id",
      "72uqs-pqaaa-aaaak-aes7a-cai"
    ],
    [
      "x-request-id",
      "01991913-6214-7802-8631-835a07b33703"
    ]
  ],
  "body": {
    "status": "replied",
    "certificate": {
      "0": 217,
      "1": 217,
      "2": 247,
      "3": 163,
      "4": 100,
      "5": 116,
      "6": 114,
      "7": 101,
      "8": 101,
      "9": 131,
      "10": 1
    }
  }
}`;
			const expected = {
				'Canister ID': '72uqs-pqaaa-aaaak-aes7a-cai',
				'Error code': 'IC0207',
				'Method name': 'get_account_transactions',
				'Reject code': '2',
				'Reject text': 'Canister 72uqs-pqaaa-aaaak-aes7a-cai is out of cycles'
			};
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toStrictEqual(expected);
		});

		it('should blajh', () => {
			const errorMsg = `ProtocolError: Request timed out after 300000 msec
  Request ID: 2e8db657c9244dead2ac4cf239227a9538e26803d2b966834ab43660ba46bb5b
  Request status: processing

    at ot.fromCode (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:10:556)
    at https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:54:1343
    at https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:54:1545
    at async G3 (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:54:2700)
    at async a (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:54:6505)
    at async https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:99:100811
    at async yR.loadBtcBalance (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:99:127833)
    at async yR.loadWalletData (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:99:128465)
    at async Promise.allSettled (index 1)
    at async xs (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:54:7953)`;
			const expected = {
				'Request status': 'processing'
			};
			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toStrictEqual(expected);
		});

		it('should....', () => {
			const errorMsg = `Error: Index canister 72uqs-pqaaa-aaaak-aes7a-cai for Ledger canister pcj6u-uaaaa-aaaak-aewnq-cai is not awake
    at uu.QO [as getBalanceAndTransactions] (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:99:207403)
    at async Promise.allSettled (index 0)
    at async xs (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:54:7953)
    at async https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:99:166984
    at async ma.executeJob (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:99:122663)
    at async a (https://beta.oisy.com/_app/immutable/workers/workers-D2ASsSmu.js:99:122301)`;

			const error = new Error(JSON.stringify(errorMsg));

			const result = parseIcErrorMessage(error);

			expect(result).toBeUndefined();
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

			expect(result).toStrictEqual(expected);
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
