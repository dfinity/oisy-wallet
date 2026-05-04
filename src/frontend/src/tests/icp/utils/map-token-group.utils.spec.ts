import { BOB_TOKEN_GROUP } from '$env/tokens/groups/groups.bob.env';
import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import { mapEnvGroupData } from '$icp/utils/map-token-group.utils';

describe('mapEnvGroupData', () => {
	it('should return empty object when groupData is undefined', () => {
		expect(mapEnvGroupData(undefined)).toEqual({});
	});

	it('should return empty object when group ID is not found in registry', () => {
		expect(mapEnvGroupData('NONEXISTENT')).toEqual({});
	});

	it('should resolve group data from registry by symbol', () => {
		const result = mapEnvGroupData('BOB');

		expect(result).toEqual({ groupData: BOB_TOKEN_GROUP });
	});

	it('should resolve group data with icon from registry', () => {
		const result = mapEnvGroupData('ETH');

		expect(result).toEqual({ groupData: ETH_TOKEN_GROUP });
	});
});
