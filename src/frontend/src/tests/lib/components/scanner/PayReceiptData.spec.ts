import PayReceiptData from '$lib/components/scanner/PayReceiptData.svelte';
import en from '$lib/i18n/en.json';
import type { Recipient } from '$lib/types/open-crypto-pay';
import { render, screen, waitFor } from '@testing-library/svelte';

const mockFormatAddress = vi.fn((address) => {
	if (!address || Object.keys(address).length === 0) {
		return '-';
	}
	return 'Bahnhofstrasse 7, 6300 Zug';
});

describe('PayReceiptData', () => {
	const fullRecipient: Recipient = {
		name: 'Test Merchant',
		address: {
			street: 'Bahnhofstrasse',
			houseNumber: '7',
			city: 'Zug',
			zip: '6300',
			country: 'CH'
		},
		phone: '+41791234567',
		mail: 'test@example.com',
		website: 'https://example.com',
		registrationNumber: 'CHE-123.456.789',
		storeType: 'Physical',
		merchantCategory: 'Retail',
		goodsType: 'Tangible',
		goodsCategory: 'General'
	};

	beforeEach(() => {
		mockFormatAddress.mockClear();
	});

	describe('with complete data', () => {
		it('should render all recipient fields when expanded', async () => {
			const { container } = render(PayReceiptData, { recipient: fullRecipient });

			const expandButton = screen.getByTestId('collapsible-btn');
			expandButton.click();

			await waitFor(() => {
				expect(screen.getByText(en.scanner.text.phone_number)).toBeInTheDocument();
			});

			expect(container.textContent).toContain('Test Merchant');
			expect(container.textContent).toContain('+41791234567');
			expect(container.textContent).toContain('test@example.com');
			expect(container.textContent).toContain('https://example.com');
			expect(container.textContent).toContain('CH');
			expect(container.textContent).toContain('Bahnhofstrasse 7, 6300 Zug');
		});

		it('should render all i18n labels when expanded', async () => {
			render(PayReceiptData, { recipient: fullRecipient });

			const expandButton = screen.getByTestId('collapsible-btn');
			expandButton.click();

			await waitFor(() => {
				expect(screen.getByText(en.scanner.text.phone_number)).toBeInTheDocument();
			});

			expect(screen.getByText(en.scanner.text.receipt)).toBeInTheDocument();
			expect(screen.getByText(en.scanner.text.name)).toBeInTheDocument();
			expect(screen.getByText(en.scanner.text.address)).toBeInTheDocument();
			expect(screen.getByText(en.scanner.text.country)).toBeInTheDocument();
			expect(screen.getByText(en.scanner.text.phone_number)).toBeInTheDocument();
			expect(screen.getByText(en.scanner.text.email_address)).toBeInTheDocument();
			expect(screen.getByText(en.scanner.text.website)).toBeInTheDocument();
		});
	});

	describe('with missing fields', () => {
		it('should show fallback for missing property', async () => {
			const { container } = render(PayReceiptData, {
				recipient: { ...fullRecipient, name: undefined }
			});

			const expandButton = screen.getByTestId('collapsible-btn');
			expandButton.click();

			await waitFor(() => {
				expect(screen.getByText(en.scanner.text.phone_number)).toBeInTheDocument();
			});

			const textSmElements = Array.from(container.querySelectorAll('.text-sm'));
			const hasNameFallback = textSmElements.some((el) => el.textContent?.trim() === '-');

			expect(hasNameFallback).toBeTruthy();
		});
	});
});
