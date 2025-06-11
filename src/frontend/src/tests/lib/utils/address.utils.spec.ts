import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { areAddressesEqual, getCaseSensitiveness } from '$lib/utils/address.utils';
import { parseNetworkId } from '$lib/validation/network.validation';

describe('address.utils', () => {
	describe('getCaseSensitiveness', () => {
		it.each(['Btc', 'Eth', 'Icrcv2', 'unknown'])(
			'should return false for %s address type',
			(rawAddressType) => {
				const addressType = rawAddressType as TokenAccountIdTypes;

				expect(getCaseSensitiveness({ addressType })).toBeFalsy();
			}
		);

		it('should return true for Sol address type', () => {
			const addressType = 'Sol' as TokenAccountIdTypes;

			expect(getCaseSensitiveness({ addressType })).toBeTruthy();
		});

		it.each([
			ICP_NETWORK,
			...SUPPORTED_BITCOIN_NETWORKS,
			...SUPPORTED_ETHEREUM_NETWORKS,
			...SUPPORTED_EVM_NETWORKS
		])('should return false for network $name', ({ id: networkId }) => {
			expect(getCaseSensitiveness({ networkId })).toBeFalsy();
		});

		it.each(SUPPORTED_SOLANA_NETWORKS)(
			'should return true for network $name',
			({ id: networkId }) => {
				expect(getCaseSensitiveness({ networkId })).toBeTruthy();
			}
		);

		it('should return false for unknown network', () => {
			expect(
				getCaseSensitiveness({
					networkId: parseNetworkId('mock-network')
				})
			).toBeFalsy();
		});

		it('should return false for undefined network', () => {
			expect(getCaseSensitiveness({ networkId: undefined })).toBeFalsy();
		});
	});

	describe('areAddressesEqual', () => {
		const address1 = 'address123';
		const address2 = 'address456';

		it('should return false for nullish addresses', () => {
			const mockAddressType = 'mock-address-type' as TokenAccountIdTypes;

			expect(
				areAddressesEqual({ address1: null, address2, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1, address2: null, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1: null, address2: null, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1: undefined, address2, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1, address2: undefined, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({
					address1: undefined,
					address2: undefined,
					addressType: mockAddressType
				})
			).toBeFalsy();
		});

		describe.each(['Btc', 'Eth', 'Icrcv2', 'unknown'])('for %s address type', (rawAddressType) => {
			const addressType = rawAddressType as TokenAccountIdTypes;

			it('should return true for equal addresses', () => {
				expect(areAddressesEqual({ address1, address2: address1, addressType })).toBeTruthy();
			});

			it('should return false for different addresses', () => {
				expect(areAddressesEqual({ address1, address2, addressType })).toBeFalsy();
			});

			it('should return true for case-insensitive equal addresses', () => {
				expect(
					areAddressesEqual({ address1, address2: address1.toUpperCase(), addressType })
				).toBeTruthy();
			});
		});

		describe('for Sol address type', () => {
			const addressType = 'Sol' as TokenAccountIdTypes;

			it('should return true for equal addresses', () => {
				expect(areAddressesEqual({ address1, address2: address1, addressType })).toBeTruthy();
			});

			it('should return false for different addresses', () => {
				expect(areAddressesEqual({ address1, address2, addressType })).toBeFalsy();
			});

			it('should return true for case-insensitive equal addresses', () => {
				expect(
					areAddressesEqual({ address1, address2: address1.toUpperCase(), addressType })
				).toBeFalsy();
			});
		});
	});
});
