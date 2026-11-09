import PaymentNotConfirmed from '$lib/components/open-crypto-pay/PaymentNotConfirmed.svelte';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type { OpenCryptoPayResponse } from '$lib/types/open-crypto-pay';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('PaymentNotConfirmed', () => {
	const mockOnClose = vi.fn();

	const displayName = 'Test Shop';

	const mockData = { displayName } as OpenCryptoPayResponse;

	const renderWithContext = (data: OpenCryptoPayResponse | undefined) =>
		render(PaymentNotConfirmed, {
			props: { onClose: mockOnClose },
			context: new Map([
				[PAY_CONTEXT_KEY, { data: writable(data), selectedToken: writable(undefined) }]
			])
		});

	const description = replacePlaceholders(en.scanner.text.payment_not_confirmed_description, {
		$receipt: displayName
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should say that the payment may have gone through', () => {
		const { getByText } = renderWithContext(mockData);

		expect(getByText(description)).toBeInTheDocument();
	});

	it('should say that the payment may have gone through when the response has no merchant name', () => {
		const responseWithoutName: OpenCryptoPayResponse = {
			id: 'pl_test123',
			externalId: 'test-external',
			mode: 'Multiple',
			tag: 'payRequest',
			callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123',
			minSendable: 1000,
			maxSendable: 10000,
			metadata: '[["text/plain", "Test"]]',
			standard: 'OpenCryptoPay',
			possibleStandards: ['OpenCryptoPay'],
			displayQr: true,
			requestedAmount: {
				asset: 'CHF',
				amount: '10'
			},
			transferAmounts: []
		};

		const { getByText, queryByText } = renderWithContext(responseWithoutName);

		expect(
			getByText(en.scanner.text.payment_not_confirmed_description_generic)
		).toBeInTheDocument();
		expect(queryByText(description)).not.toBeInTheDocument();
	});

	it('should offer Close and no Try again', () => {
		const { getByText, queryByText } = renderWithContext(mockData);

		expect(getByText(en.core.text.close)).toBeInTheDocument();
		expect(queryByText(en.scanner.text.try_again)).not.toBeInTheDocument();
	});

	it('should call onClose when Close is clicked', async () => {
		const { getByText } = renderWithContext(mockData);

		await fireEvent.click(getByText(en.core.text.close));

		expect(mockOnClose).toHaveBeenCalledOnce();
	});
});
