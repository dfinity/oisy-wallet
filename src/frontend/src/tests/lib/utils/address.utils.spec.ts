import { AddressTypeSchema } from '$lib/schema/address.schema';
import { getNetworksForAddressType } from '$lib/utils/address.utils';

describe('address.utils', () => {
	describe('getNetworksForAddressType', () => {
		it('should return networks for all types', () => {
			AddressTypeSchema.options.forEach((type) => {
				const networks = getNetworksForAddressType(type);

				expect(networks).toBeDefined();
				expect(Array.isArray(networks)).toBeTruthy();
				expect(networks.length).toBeGreaterThan(0);
			});
		});
	});
});
