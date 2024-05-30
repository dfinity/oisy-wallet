import { ICP_TOKEN } from '$env/tokens.env';
import QRCodeScan from '$lib/components/send/QRCodeScan.svelte';
import { toastsError } from '$lib/stores/toasts.store';
import { render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../mocks/i18n.mock';

const props = {
	expectedToken: ICP_TOKEN,
	destination: 'some-destination',
	amount: 1,
	decodeQrCode: vi.fn()
};

vi.mock('$lib/stores/toasts.store');

describe('QRCodeReaderComponent', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should show timeout error on QR scan timeout', async () => {
		vi.useFakeTimers();

		render(QRCodeScan, { props });

		vi.advanceTimersByTime(30001);

		await waitFor(() =>
			expect(toastsError).toHaveBeenCalledWith({
				msg: { text: en.send.error.qr_scan_timeout }
			})
		);

		vi.useRealTimers();
	});
});
