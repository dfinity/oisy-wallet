import { mapIcrcData } from '$icp/utils/map-icrc-data';
import * as appConstants from '$lib/constants/app.constants';

describe('mapIcrcData', () => {
	const token = {
		TESTTOKEN: {
			ledgerCanisterId: 'dummy-ledger-id',
			indexCanisterId: 'dummy-canister-id'
		}
	};

	const expected = {
		TESTTOKEN: token.TESTTOKEN
	};

	const envs = [
		{ env: 'PROD', expected },
		{ env: 'BETA', expected },
		{ env: 'STAGING', expected },
		{ env: 'LOCAL', expected: {} }
	];

	describe.each(envs)('when %s is true', ({ env, expected }) => {
		beforeEach(() => {
			vi.resetAllMocks();

			envs.forEach(({ env: e }) => {
				vi.spyOn(appConstants, e as keyof typeof appConstants, 'get').mockImplementation(
					() => false
				);
			});

			vi.spyOn(appConstants, env as keyof typeof appConstants, 'get').mockImplementation(
				() => true
			);
		});

		it('should map ICRC tokens correctly', () => {
			const result = mapIcrcData(token);

			expect(result).toEqual(expected);
		});
	});

	it('should handle empty input', () => {
		const result = mapIcrcData({});

		expect(result).toEqual({});
	});
});
