import { render, screen, fireEvent } from '@testing-library/svelte';
import ShowQrCodeStep from '$lib/components/address-book/ShowQrCodeStep.svelte';
import type { Address } from '$lib/types/contact';
import { vi } from 'vitest';

describe('ShowQrCodeStep', () => {
	const mockAddress: Address = {
		address: '0x1234567890abcdef',
		address_type: 'Eth',
		alias: 'Test Wallet'
	};

	it('renders QR code and address info', () => {
		const close = vi.fn();
		render(ShowQrCodeStep, { props: { address: mockAddress, close } });
		expect(screen.getByText('Test Wallet')).toBeInTheDocument();
		expect(screen.getByLabelText(/qr code/i)).toBeInTheDocument();
	});
});
