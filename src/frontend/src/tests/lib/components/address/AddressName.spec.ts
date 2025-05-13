import AddressName from '$lib/components/address/AddressName.svelte';
import type { Address } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('AddressName', () => {
	// Mock the i18n store
	const mockI18n = readable(en);

	// Setup the context with the mocked i18n store
	const mockContext = new Map([['i18n', mockI18n]]);

	it('should display Internet Computer for Icrc2 address type', () => {
		const address: Address = {
			address_type: 'Icrc2',
			address: '0x123456789'
		};

		const { container } = render(AddressName, {
			props: { address },
			context: mockContext
		});

		expect(container).toHaveTextContent(en.address.types.Icrc2);
	});

	it('should display Bitcoin for Btc address type', () => {
		const address: Address = {
			address_type: 'Btc',
			address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
		};

		const { container } = render(AddressName, {
			props: { address },
			context: mockContext
		});

		expect(container).toHaveTextContent(en.address.types.Btc);
	});

	it('should display Ethereum for Eth address type', () => {
		const address: Address = {
			address_type: 'Eth',
			address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
		};

		const { container } = render(AddressName, {
			props: { address },
			context: mockContext
		});

		expect(container).toHaveTextContent(en.address.types.Eth);
	});

	it('should display Solana for Sol address type', () => {
		const address: Address = {
			address_type: 'Sol',
			address: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaC'
		};

		const { container } = render(AddressName, {
			props: { address },
			context: mockContext
		});

		expect(container).toHaveTextContent(en.address.types.Sol);
	});

	it('should handle address with alias property', () => {
		const address: Address = {
			address_type: 'Eth',
			address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
			alias: 'My Ethereum Address'
		};

		const { container } = render(AddressName, {
			props: { address },
			context: mockContext
		});

		// The component should still display the address type, not the alias
		expect(container).toHaveTextContent(en.address.types.Eth);
	});
});
