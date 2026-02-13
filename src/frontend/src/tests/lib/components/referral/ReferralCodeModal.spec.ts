import type { ReferrerInfo } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import ReferralCodeModal from '$lib/components/referral/ReferralCodeModal.svelte';
import { OISY_REFERRAL_URL } from '$lib/constants/oisy.constants';
import {
	REFERRAL_CODE_COPY_BUTTON,
	REFERRAL_CODE_LEARN_MORE,
	REFERRAL_CODE_SHARE_BUTTON
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

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

	const mockedReferrerInfo: ReferrerInfo = {
		referral_code: 6127361253,
		num_referrals: []
	};

	it('should render the referral code modal items', async () => {
		mockAuthStore();
		vi.spyOn(rewardApi, 'getReferrerInfo').mockResolvedValue(mockedReferrerInfo);

		const { getByText, container } = render(ReferralCodeModal);

		await waitFor(() => {
			const qrCode: HTMLDivElement | null = container.querySelector(qrCodeSelector);
			const qrCodeURL: HTMLOutputElement | null = container.querySelector(urlSelector);
			const copyButton: HTMLButtonElement | null = container.querySelector(copyButtonSelector);
			const shareButton: HTMLButtonElement | null = container.querySelector(shareButtonSelector);
			const learnMoreAnchor: HTMLAnchorElement | null =
				container.querySelector(learnMoreAnchorSelector);

			expect(qrCode).toBeInTheDocument();

			expect(qrCodeURL).toBeInTheDocument();
			expect(qrCodeURL?.textContent).includes(mockedReferrerInfo.referral_code.toString());

			expect(copyButton).toBeInTheDocument();

			expect(shareButton).toBeInTheDocument();

			expect(getByText(get(i18n).referral.invitation.text.not_referred_yet)).toBeInTheDocument();

			expect(learnMoreAnchor).toBeInTheDocument();
			expect(learnMoreAnchor?.href).toBe(OISY_REFERRAL_URL);
		});
	});

	it('should render amount of referrals correctly', async () => {
		mockAuthStore();

		const numberOfReferrals = 2;
		vi.spyOn(rewardApi, 'getReferrerInfo').mockResolvedValue({
			...mockedReferrerInfo,
			num_referrals: [numberOfReferrals]
		});

		const { getByText } = render(ReferralCodeModal);

		await waitFor(() => {
			expect(
				getByText(
					replacePlaceholders(get(i18n).referral.invitation.text.referred_amount, {
						$amount: numberOfReferrals.toString()
					})
				)
			).toBeInTheDocument();
		});
	});
});
