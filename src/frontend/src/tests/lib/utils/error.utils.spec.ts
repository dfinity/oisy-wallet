import {
	errorDetailToString,
	formatIcCallError,
	isVersionMismatchError,
	mapIcErrorMetadata,
	parseIcErrorMessage,
	replaceErrorFields,
	replaceIcErrorFields
} from '$lib/utils/error.utils';

describe('error.utils', () => {
	describe('errorDetailToString', () => {
		it('should return the string as-is if err is a string', () => {
			expect(errorDetailToString('some error')).toBe('some error');
		});

		it('should return the message if err is an Error', () => {
			expect(errorDetailToString(new Error('fail'))).toBe('fail');
		});

		it('should return the message if err is an object with a message property', () => {
			expect(errorDetailToString({ message: 'object error' })).toBe('object error');
		});

		it('should return undefined if err has no message property', () => {
			expect(errorDetailToString({ code: 500 })).toBeUndefined();
		});

		it('should return undefined for an object without message', () => {
			expect(errorDetailToString({ code: 500, detail: 'not found' })).toBeUndefined();
		});
	});

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

		it('should handle Error with message containing only stack traces', () => {
			const errorMsg = `Call failed:\n  at Function.from (test.js:1:1)\n  at Object.<anonymous> (test.js:2:2)`;
			const error = new Error(JSON.stringify(errorMsg));

			expect(parseIcErrorMessage(error)).toBeUndefined();
		});

		it('should handle Error with message containing only URLs', () => {
			const errorMsg = `Call failed:\nhttps://example.com/error`;
			const error = new Error(JSON.stringify(errorMsg));

			expect(parseIcErrorMessage(error)).toBeUndefined();
		});

		it('should handle Error with message containing lines that do not match kv pattern', () => {
			const errorMsg = `Call failed:\nsome random text without colons`;
			const error = new Error(JSON.stringify(errorMsg));

			expect(parseIcErrorMessage(error)).toBeUndefined();
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

		it('should fall back to replaceIcErrorFields when parseIcErrorMessage returns undefined', () => {
			const result = mapIcErrorMetadata('simple string error');

			expect(result).toEqual({ error: 'simple string error' });
		});

		it('should fall back to String(err) when replaceIcErrorFields returns undefined', () => {
			const result = mapIcErrorMetadata(42);

			expect(result).toEqual({ error: '42' });
		});

		it('should use parsed IC error when parseIcErrorMessage succeeds', () => {
			const errorMsg = `Call failed: \n message: fail\n code: 500`;
			const error = new Error(JSON.stringify(errorMsg));

			const result = mapIcErrorMetadata(error);

			expect(result).toStrictEqual({
				message: 'fail',
				code: '500'
			});
		});

		it('should fall back to replaceIcErrorFields for Error without parseable IC format', () => {
			const error = new Error('Simple error message');

			const result = mapIcErrorMetadata(error);

			expect(result).toEqual({ error: 'Simple error message' });
		});
	});

	describe('formatIcCallError', () => {
		it('should pass through non-Error values unchanged', () => {
			expect(formatIcCallError({ err: 'hello' })).toBe('hello');

			expect(formatIcCallError({ err: 42 })).toBe(42);

			expect(formatIcCallError({ err: null })).toBe(null);

			expect(formatIcCallError({ err: undefined })).toBe(undefined);

			expect(formatIcCallError({ err: true })).toBeTruthy();
		});

		it('should pass through non-IC errors unchanged', () => {
			const err = new Error('Something went wrong');

			expect(formatIcCallError({ err })).toBe(err);
		});

		it('should pass through errors without Call context marker', () => {
			const err = new Error('Network timeout');

			expect(formatIcCallError({ err })).toBe(err);
		});

		it('should format RejectError with call context', () => {
			const err = new Error(
				'The replica returned a rejection error:\n' +
					'  Request ID: abc123def456\n' +
					'  Reject code: 5\n' +
					'  Reject text: Requested canister has no wasm module\n' +
					'  Error code: IC0537\n\n' +
					'Call context:\n' +
					'  Canister ID: itgqj-7qaaa-aaaaq-aadoa-cai\n' +
					'  Method name: icrc1_balance_of\n' +
					'  HTTP details: {"ok":true,"status":200,"statusText":"","headers":[],"body":{"status":"non_replicated_rejection","error_code":"IC0537","reject_code":5,"reject_message":"Requested canister has no wasm module"}}'
			);
			err.name = 'RejectError';

			const result = formatIcCallError({ err });

			expect(result).toContain('RejectError');
			expect(result).toContain('Reject code: 5');
			expect(result).toContain('Reject text: Requested canister has no wasm module');
			expect(result).toContain('Error code: IC0537');
			expect(result).toContain('Canister ID: itgqj-7qaaa-aaaaq-aadoa-cai');
			expect(result).toContain('Method name: icrc1_balance_of');
			expect(result).not.toContain('Request ID');
			expect(result).not.toContain('HTTP details');
			expect(result).not.toContain('"ok"');
		});

		it('should preserve the canister trap message while hiding HTTP details', () => {
			const err = new Error(
				'Something went wrong while saving the token. / The replica returned a rejection error:\n' +
					'  Request ID: 8d0f1e2f33f0dc19656dc3d48a27a51978bb1538d182aec1af23432d97188740\n' +
					'  Reject code: 5\n' +
					'  Reject text: Error from Canister d3nvo-aaaaa-aaaar-qagzq-cai: Canister called `ic0.trap` with message: \'Version mismatch, token update not allowed. Existing token: CustomToken { token: Erc4626(ErcToken { token_address: ErcTokenId("0xd6701905c59ee618dc36dc747506bce0a4ac760a"), chain_id: 8453 }), enabled: false, version: Some(1) }, New token: CustomToken { token: Erc4626(ErcToken { token_address: ErcTokenId("0xd6701905c59ee618dc36dc747506bce0a4ac760a"), chain_id: 8453 }), enabled: true, version: Some(4) }\'.\n' +
					'Consider gracefully handling failures from this canister or altering the canister to handle exceptions. See documentation: https://internetcomputer.org/docs/current/references/execution-errors#trapped-explicitly\n' +
					'  Error code: IC0503\n\n' +
					'Call context:\n' +
					'  Canister ID: d3nvo-aaaaa-aaaar-qagzq-cai\n' +
					'  Method name: set_many_custom_tokens\n' +
					'  HTTP details: {"ok":true,"status":200,"statusText":"","headers":[],"body":{"status":"replied","certificate":{"0":217,"1":217,"2":247}}}'
			);

			const result = formatIcCallError({ err }) as string;

			expect(result).toContain('Version mismatch, token update not allowed');
			expect(result).toContain('Reject code: 5');
			expect(result).toContain('Error code: IC0503');
			expect(result).toContain('Canister ID: d3nvo-aaaaa-aaaar-qagzq-cai');
			expect(result).toContain('Method name: set_many_custom_tokens');
			expect(result).not.toContain('Request ID');
			expect(result).not.toContain('Consider gracefully');
			expect(result).not.toContain('certificate');
			expect(result).not.toContain('"ok"');
			expect(result).not.toContain('HTTP details');
		});

		it('should strip the "Consider gracefully handling" boilerplate', () => {
			const err = new Error(
				'The replica returned a rejection error:\n' +
					'  Reject code: 5\n' +
					'  Reject text: Canister trapped\n' +
					'  Error code: IC0503\n' +
					'Consider gracefully handling failures from this canister or altering the canister to handle exceptions. See documentation: https://internetcomputer.org/docs/current/references/ic-interface-spec/#error-handling\n' +
					'Call context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					'  HTTP details: {"ok":true,"status":200}'
			);

			const result = formatIcCallError({ err }) as string;

			expect(result).toContain('Reject code: 5');
			expect(result).not.toContain('Consider gracefully');
			expect(result).not.toContain('See documentation');
		});

		it('should truncate long Return types in UnknownError', () => {
			const err = new Error(
				'Unexpected error: "Call was returned undefined. We cannot determine if the call was successful or not. Return types: [variant {Ok:record {balance:nat; transactions:vec record {id:nat; transaction:record {burn:opt record {fee:opt nat}}}}; Err:record {message:text}}]."\n' +
					'Call context:\n' +
					'  Canister ID: us3ng-pyaaa-aaaan-q2cva-cai\n' +
					'  Method name: get_account_transactions\n' +
					'  HTTP details: {"ok":true,"status":200}'
			);
			err.name = 'UnknownError';

			const result = formatIcCallError({ err });

			expect(result).toContain('UnknownError');
			expect(result).toContain('Return types: [...].');
			expect(result).not.toContain('variant');
			expect(result).not.toContain('record');
			expect(result).toContain('Canister ID: us3ng-pyaaa-aaaan-q2cva-cai');
			expect(result).toContain('Method name: get_account_transactions');
		});

		it('should strip HTTP details by default', () => {
			const err = new Error(
				'Some error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					'  HTTP details: {"ok":true,"status":200,"headers":[["content-type","application/cbor"]]}'
			);

			const result = formatIcCallError({ err });

			expect(result).not.toContain('"ok"');
			expect(result).not.toContain('200');
			expect(result).not.toContain('content-type');
		});

		it('should show HTTP status when showHttpStatus is true', () => {
			const err = new Error(
				'Some error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					'  HTTP details: {"ok":true,"status":200,"statusText":"OK"}'
			);

			const result = formatIcCallError({ err, options: { showHttpStatus: true } });

			expect(result).toContain('HTTP: 200 OK');
		});

		it('should show HTTP status without statusText when empty', () => {
			const err = new Error(
				'Some error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					'  HTTP details: {"ok":true,"status":200,"statusText":""}'
			);

			const result = formatIcCallError({ err, options: { showHttpStatus: true } });

			expect(result).toContain('HTTP: 200');
			expect(result).not.toMatch(/HTTP: 200\s/);
		});

		it('should show HTTP headers when showHttpHeaders is true', () => {
			const err = new Error(
				'Some error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					'  HTTP details: {"ok":true,"status":200,"headers":[["content-type","application/cbor"],["content-length","122"]]}'
			);

			const result = formatIcCallError({ err, options: { showHttpHeaders: true } });

			expect(result).toContain('Headers:');
			expect(result).toContain('content-type');
			expect(result).toContain('application/cbor');
		});

		it('should show sanitized HTTP body with byte arrays replaced', () => {
			const certificate = Object.fromEntries(
				Array.from({ length: 20 }, (_, i) => [String(i), 100 + i])
			);
			const body = { status: 'replied', certificate };

			const err = new Error(
				'Some error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					`  HTTP details: {"ok":true,"status":200,"body":${JSON.stringify(body)}}`
			);

			const result = formatIcCallError({ err, options: { showHttpBody: true } });

			expect(result).toContain('Body:');
			expect(result).toContain('"status":"replied"');
			expect(result).toContain('[20 bytes]');
			expect(result).not.toContain('"0":');
		});

		it('should show sanitized request details with byte arrays replaced', () => {
			const arg = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [String(i), i]));
			const nonce = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i), i]));
			const requestDetails = {
				request_type: 'call',
				canister_id: { __principal__: 'abc-cai' },
				method_name: 'test',
				arg,
				sender: { __principal__: 'sender-id' },
				nonce
			};

			const err = new Error(
				'Some error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					`  HTTP details: {"ok":true,"status":200,"requestDetails":${JSON.stringify(requestDetails)}}`
			);

			const result = formatIcCallError({ err, options: { showRequestDetails: true } });

			expect(result).toContain('Request:');
			expect(result).toContain('"request_type":"call"');
			expect(result).toContain('[80 bytes]');
			expect(result).toContain('[16 bytes]');
			expect(result).toContain('abc-cai');
			expect(result).not.toContain('"0":0');
		});

		it('should handle malformed HTTP details JSON gracefully', () => {
			const err = new Error(
				'Some error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					'  HTTP details: {not valid json'
			);

			const result = formatIcCallError({ err, options: { showHttpStatus: true } });

			expect(result).toContain('Canister ID: abc-cai');
			expect(result).toContain('Method name: test');
			expect(result).not.toContain('HTTP:');
		});

		it('should handle error with Call context but no HTTP details', () => {
			const err = new Error(
				'Some error\nCall context:\n' + '  Canister ID: abc-cai\n' + '  Method name: test'
			);

			const result = formatIcCallError({ err });

			expect(result).toContain('Canister ID: abc-cai');
			expect(result).toContain('Method name: test');
		});

		it('should handle multiple options enabled together', () => {
			const body = { status: 'non_replicated_rejection', error_code: 'IC0537' };
			const err = new Error(
				'Error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					`  HTTP details: {"ok":true,"status":200,"statusText":"","headers":[["x-ic-canister-id","abc-cai"]],"body":${JSON.stringify(body)}}`
			);

			const result = formatIcCallError({
				err,
				options: {
					showHttpStatus: true,
					showHttpHeaders: true,
					showHttpBody: true
				}
			});

			expect(result).toContain('HTTP: 200');
			expect(result).toContain('Headers:');
			expect(result).toContain('Body:');
			expect(result).toContain('IC0537');
		});

		it('should not treat small objects as byte arrays', () => {
			const body = { status: 'replied', data: { '0': 1, '1': 2 } };
			const err = new Error(
				'Error\nCall context:\n' +
					'  Canister ID: abc-cai\n' +
					'  Method name: test\n' +
					`  HTTP details: {"ok":true,"status":200,"body":${JSON.stringify(body)}}`
			);

			const result = formatIcCallError({ err, options: { showHttpBody: true } });

			expect(result).toContain('"0":1');
			expect(result).not.toContain('bytes');
		});
	});

	describe('isVersionMismatchError', () => {
		it('should return true for an Error with "Version mismatch" in the message', () => {
			expect(
				isVersionMismatchError(
					new Error('Version mismatch, token update not allowed. Existing token: ...')
				)
			).toBeTruthy();
		});

		it('should return true for an IC agent error containing "Version mismatch"', () => {
			expect(
				isVersionMismatchError(
					new Error(
						'AgentError: Call failed:\n  Reject message: "Version mismatch, token update not allowed"'
					)
				)
			).toBeTruthy();
		});

		it('should return false for an Error without "Version mismatch"', () => {
			expect(isVersionMismatchError(new Error('Some other error'))).toBeFalsy();
		});

		it('should return false for a string', () => {
			expect(isVersionMismatchError('Version mismatch')).toBeFalsy();
		});

		it('should return false for null', () => {
			expect(isVersionMismatchError(null)).toBeFalsy();
		});

		it('should return false for undefined', () => {
			expect(isVersionMismatchError(undefined)).toBeFalsy();
		});
	});
});
