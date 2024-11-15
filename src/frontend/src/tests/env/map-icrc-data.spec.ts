import { describe, expect, it } from 'vitest';

import { mapIcrcData } from '$env/map-icrc-data';

describe('mapIcrcData', () => {
	beforeEach(() => {
		vi.mock('$lib/constants/app.constants', () => ({
			PROD: true,
			STAGING: false,
			BETA: false
		}));
	});

	afterEach(() => vi.clearAllMocks());

	it('should map ICRC tokens with exchangeCoinId', () => {
		const token = {
			TESTTOKEN: {
				ledgerCanisterId: 'dummy-ledger-id',
				indexCanisterId: 'dummy-canister-id'
			}
		};

		const result = mapIcrcData(token);

		expect(result).toEqual({
			TESTTOKEN: {
				...token.TESTTOKEN,
				exchangeCoinId: 'internet-computer'
			}
		});
	});

	it('should handle empty input', () => {
		const result = mapIcrcData({});
		expect(result).toEqual({});
	});
});
