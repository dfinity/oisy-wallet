import type { NewVipRewardResponse } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import VipQrCodeModal from '$lib/components/qr/VipQrCodeModal.svelte';
import {
	VIP_CODE_REGENERATE_BUTTON,
	VIP_QR_CODE_COPY_BUTTON
} from '$lib/constants/test-ids.constants';
import * as authStore from '$lib/derived/auth.derived';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Identity } from '@dfinity/agent';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import { vi } from 'vitest';

describe('VipQrCodeModal', () => {
	const qrCodeSelector = `div[data-tid="qr-code"]`;
	const urlSelector = `output`;
	const copyButtonSelector = `button[data-tid=${VIP_QR_CODE_COPY_BUTTON}]`;
	const regenerateButtonSelector = `button[data-tid=${VIP_CODE_REGENERATE_BUTTON}]`;

	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	const mockedNewRewardResponse: NewVipRewardResponse = {
		VipReward: {
			code: '1234567890'
		}
	};

	it('should render the vip qr code modal items', async () => {
		mockAuthStore();
		vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

		const { container } = render(VipQrCodeModal);

		await waitFor(() => {
			const qrCode: HTMLDivElement | null = container.querySelector(qrCodeSelector);
			const qrCodeURL: HTMLOutputElement | null = container.querySelector(urlSelector);
			const copyButton: HTMLButtonElement | null = container.querySelector(copyButtonSelector);
			const regenerateButton: HTMLButtonElement | null =
				container.querySelector(regenerateButtonSelector);

			if (
				qrCode === null ||
				qrCodeURL === null ||
				copyButton === null ||
				regenerateButton === null
			) {
				throw new Error('one of the elements is not yet loaded.');
			}

			expect(qrCode).toBeInTheDocument();

			expect(qrCodeURL).toBeInTheDocument();
			expect(qrCodeURL?.textContent?.includes(mockedNewRewardResponse.VipReward.code));

			expect(copyButton).toBeInTheDocument();

			expect(regenerateButton).toBeInTheDocument();
		});
	});

	it('should regenerate reward code', async () => {
		const regeneratedNewRewardResponse: NewVipRewardResponse = {
			VipReward: {
				code: '0987654321'
			}
		};

		mockAuthStore();
		vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

		const { container } = render(VipQrCodeModal);

		await waitFor(() => {
			const qrCodeURL: HTMLOutputElement | null = container.querySelector(urlSelector);
			const regenerateButton: HTMLButtonElement | null =
				container.querySelector(regenerateButtonSelector);

			if (qrCodeURL === null || regenerateButton === null) {
				throw new Error('one of the elements is not yet loaded.');
			}

			expect(qrCodeURL).toBeInTheDocument();
			expect(qrCodeURL?.textContent?.includes(mockedNewRewardResponse.VipReward.code));

			expect(regenerateButton).toBeInTheDocument();

			vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(regeneratedNewRewardResponse);
			regenerateButton.click();
		});

		await waitFor(() => {
			const reloadedQrCodeUrl: HTMLOutputElement | null = container.querySelector(urlSelector);

			if (
				reloadedQrCodeUrl === null ||
				!reloadedQrCodeUrl?.textContent?.includes(regeneratedNewRewardResponse.VipReward.code)
			) {
				throw new Error('reward code not yet reloaded.');
			}

			expect(reloadedQrCodeUrl?.textContent?.includes(regeneratedNewRewardResponse.VipReward.code));
		});
	});
});
