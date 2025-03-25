import ReferralCodeModal from '$lib/components/referral/ReferralCodeModal.svelte';
import {
	REFERRAL_CODE_COPY_BUTTON,
	REFERRAL_CODE_LEARN_MORE,
	REFERRAL_CODE_SHARE_BUTTON
} from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('ReferralCodeModal', () => {
	const qrCodeSelector = `div[data-tid="qr-code"]`;
	const urlSelector = `output`;
	const copyButtonSelector = `button[data-tid=${REFERRAL_CODE_COPY_BUTTON}]`;
	const shareButtonSelector = `button[data-tid=${REFERRAL_CODE_SHARE_BUTTON}]`;
	const learnMoreAnchorSelector = `a[data-tid=${REFERRAL_CODE_LEARN_MORE}]`;

	Object.defineProperty(navigator, 'share', {
		writable: true,
		value: vi.fn()
	});

	it('should render the referral code modal items', async () => {
		const { container } = render(ReferralCodeModal);

		const qrCode: HTMLDivElement | null = container.querySelector(qrCodeSelector);
		const qrCodeURL: HTMLOutputElement | null = container.querySelector(urlSelector);
		const copyButton: HTMLButtonElement | null = container.querySelector(copyButtonSelector);
		const shareButton: HTMLButtonElement | null = container.querySelector(shareButtonSelector);
		const learnMoreAnchor: HTMLAnchorElement | null =
			container.querySelector(learnMoreAnchorSelector);

		expect(qrCode).toBeInTheDocument();

		expect(qrCodeURL).toBeInTheDocument();
		// expect(qrCodeURL?.textContent?.includes('mockedResponse'))

		expect(copyButton).toBeInTheDocument();

		expect(shareButton).toBeInTheDocument();

		expect(learnMoreAnchor).toBeInTheDocument();
		// expect(learnMoreAnchor?.href.includes(''))
	});
});
