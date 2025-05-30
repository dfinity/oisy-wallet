import type { ContactAddressUi } from '$lib/types/contact';
import { compareContactAddresses } from '$lib/utils/contact-address.utils';

describe('contact-address.utils', () => {
	describe('compareContactAddresses', () => {
		// Test comparing addresses with different network types
		it('should compare addresses by network type according to predefined order', () => {
			const btcAddress: ContactAddressUi = {
				address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
				label: 'BTC Address',
				addressType: 'Btc'
			};

			const ethAddress: ContactAddressUi = {
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				label: 'ETH Address',
				addressType: 'Eth'
			};

			const icpAddress: ContactAddressUi = {
				address: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
				label: 'ICP Address',
				addressType: 'Icrcv2'
			};

			const solAddress: ContactAddressUi = {
				address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
				label: 'SOL Address',
				addressType: 'Sol'
			};

			// Btc comes before Eth
			expect(compareContactAddresses(btcAddress, ethAddress)).toBeLessThan(0);
			expect(compareContactAddresses(ethAddress, btcAddress)).toBeGreaterThan(0);

			// Eth comes before Icrcv2
			expect(compareContactAddresses(ethAddress, icpAddress)).toBeLessThan(0);
			expect(compareContactAddresses(icpAddress, ethAddress)).toBeGreaterThan(0);

			// Icrcv2 comes before Sol
			expect(compareContactAddresses(icpAddress, solAddress)).toBeLessThan(0);
			expect(compareContactAddresses(solAddress, icpAddress)).toBeGreaterThan(0);

			// Btc comes before Sol (transitive property)
			expect(compareContactAddresses(btcAddress, solAddress)).toBeLessThan(0);
			expect(compareContactAddresses(solAddress, btcAddress)).toBeGreaterThan(0);
		});

		// Test comparing addresses with the same network type but different aliases
		it('should compare addresses with the same network type by alias (alphabetically)', () => {
			const createAddress = (label: string): ContactAddressUi => ({
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				label,
				addressType: 'Eth'
			});

			const address1 = createAddress('Alice');
			const address2 = createAddress('Bob');
			const address3 = createAddress('Charlie');

			expect(compareContactAddresses(address1, address2)).toBeLessThan(0);
			expect(compareContactAddresses(address2, address1)).toBeGreaterThan(0);
			expect(compareContactAddresses(address2, address3)).toBeLessThan(0);
			expect(compareContactAddresses(address3, address2)).toBeGreaterThan(0);
		});

		// Test comparing addresses with empty aliases
		it('should place addresses with empty aliases last', () => {
			const addressWithAlias: ContactAddressUi = {
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				label: 'My ETH',
				addressType: 'Eth'
			};

			const addressWithEmptyAlias: ContactAddressUi = {
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				label: '',
				addressType: 'Eth'
			};

			const addressWithoutAlias: ContactAddressUi = {
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				addressType: 'Eth'
			};

			expect(compareContactAddresses(addressWithAlias, addressWithEmptyAlias)).toBeLessThan(0);
			expect(compareContactAddresses(addressWithEmptyAlias, addressWithAlias)).toBeGreaterThan(0);

			expect(compareContactAddresses(addressWithAlias, addressWithoutAlias)).toBeLessThan(0);
			expect(compareContactAddresses(addressWithoutAlias, addressWithAlias)).toBeGreaterThan(0);

			// Both have empty aliases, should be equal in terms of alias comparison
			expect(compareContactAddresses(addressWithEmptyAlias, addressWithoutAlias)).toBe(0);
			expect(compareContactAddresses(addressWithoutAlias, addressWithEmptyAlias)).toBe(0);
		});

		// Test comparing addresses with the same network type and alias but different addresses
		it('should compare addresses with the same network type and alias by address string', () => {
			const address1: ContactAddressUi = {
				address: '0x1111111111111111111111111111111111111111',
				label: 'Same Label',
				addressType: 'Eth'
			};

			const address2: ContactAddressUi = {
				address: '0x2222222222222222222222222222222222222222',
				label: 'Same Label',
				addressType: 'Eth'
			};

			expect(compareContactAddresses(address1, address2)).toBeLessThan(0);
			expect(compareContactAddresses(address2, address1)).toBeGreaterThan(0);
		});

		// Test comparing identical addresses
		it('should return 0 for identical addresses', () => {
			const address: ContactAddressUi = {
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				label: 'My ETH',
				addressType: 'Eth'
			};

			const sameCopy: ContactAddressUi = { ...address };

			expect(compareContactAddresses(address, sameCopy)).toBe(0);
			expect(compareContactAddresses(sameCopy, address)).toBe(0);
		});

		// Test network type priority overrides other factors
		it('should prioritize network type over alias and address', () => {
			const btcAddress: ContactAddressUi = {
				address: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', // Lexicographically comes after
				label: 'zzz', // Lexicographically comes after
				addressType: 'Btc' // But has higher priority in sort order
			};

			const ethAddress: ContactAddressUi = {
				address: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // Lexicographically comes before
				label: 'aaa', // Lexicographically comes before
				addressType: 'Eth' // But has lower priority in sort order
			};

			// Btc should still come before Eth despite the lexicographical ordering of address and label
			expect(compareContactAddresses(btcAddress, ethAddress)).toBeLessThan(0);
			expect(compareContactAddresses(ethAddress, btcAddress)).toBeGreaterThan(0);
		});
	});
});
