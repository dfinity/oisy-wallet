import type { NewVipRewardResponse } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import VipQrCodeModal from '$lib/components/vip/VipQrCodeModal.svelte';
import { CODE_REGENERATE_INTERVAL_IN_SECONDS } from '$lib/constants/app.constants';
import {
	VIP_CODE_REGENERATE_BUTTON,
	VIP_QR_CODE_BINANCE_ICON,
	VIP_QR_CODE_COPY_BUTTON,
	VIP_QR_CODE_ICON
} from '$lib/constants/test-ids.constants';
import { QrCodeType } from '$lib/enums/qr-code-types';
import { i18n } from '$lib/stores/i18n.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('VipQrCodeModal', () => {
	const qrCodeSelector = `div[data-tid="qr-code"]`;
	const urlSelector = `output`;
	const copyButtonSelector = `button[data-tid=${VIP_QR_CODE_COPY_BUTTON}]`;
	const regenerateButtonSelector = `button[data-tid=${VIP_CODE_REGENERATE_BUTTON}]`;
	const vipCodeIconSelector = `svg[data-tid=${VIP_QR_CODE_ICON}]`;
	const vipCodeBinanceIconSelector = `svg[data-tid=${VIP_QR_CODE_BINANCE_ICON}]`;

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
			expect(qrCodeURL?.textContent).includes(mockedNewRewardResponse.VipReward.code);

			expect(copyButton).toBeInTheDocument();

			expect(regenerateButton).toBeInTheDocument();
		});
	});

	it('should render vip specific data', async () => {
		mockAuthStore();
		vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

		const { container, getByText } = render(VipQrCodeModal);

		expect(getByText(get(i18n).vip.invitation.text.title)).toBeInTheDocument();

		await waitFor(() => {
			const vipCodeIcon: Element | null = container.querySelector(vipCodeIconSelector);

			expect(vipCodeIcon).toBeInTheDocument();
		});
	});

	it('should render binance specific data', async () => {
		mockAuthStore();
		vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

		const { container, getByText } = render(VipQrCodeModal, { codeType: QrCodeType.GOLD });

		expect(getByText(get(i18n).vip.invitation.text.binance_title)).toBeInTheDocument();

		await waitFor(() => {
			const vipCodeBinanceIcon: Element | null = container.querySelector(
				vipCodeBinanceIconSelector
			);

			expect(vipCodeBinanceIcon).toBeInTheDocument();
		});
	});

	describe('countdown timer', () => {
		const countdownSelector = 'span.mb-4.block';

		const readCounter = (container: HTMLElement): number | undefined => {
			const text = container.querySelector(countdownSelector)?.textContent ?? '';
			const match = text.match(/(\d+)\s*sec/);
			return match ? Number(match[1]) : undefined;
		};

		// Advances fake time by `seconds * 1000ms` one second at a time, flushing the
		// microtask queue between ticks so that the recursively scheduled `setTimeout`
		// chain (behind `await intervalFunction()`) is picked up by the next advance.
		const tickSeconds = async (seconds: number) => {
			for (let i = 0; i < seconds; i++) {
				await vi.advanceTimersByTimeAsync(1_000);
				await tick();
			}
		};

		const waitForInitialLoad = async () => {
			await vi.advanceTimersByTimeAsync(0);
			await tick();
			await tick();
		};

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should decrement by 1 per second (no acceleration)', async () => {
			mockAuthStore();
			vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

			const { container } = render(VipQrCodeModal);

			await waitForInitialLoad();
			await tickSeconds(5);

			expect(readCounter(container)).toBe(CODE_REGENERATE_INTERVAL_IN_SECONDS - 5);
		});

		it('should not accelerate after regeneration (serial timer guarantee)', async () => {
			mockAuthStore();
			vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

			const { container } = render(VipQrCodeModal);

			await waitForInitialLoad();

			// Run through a full cycle + a handful of ticks into the next cycle.
			// If `scheduleNext` leaks a duplicate timer across `regenerateCode`, the
			// counter will have decremented by more than 5 in the second cycle.
			await tickSeconds(CODE_REGENERATE_INTERVAL_IN_SECONDS + 5);

			expect(readCounter(container)).toBe(CODE_REGENERATE_INTERVAL_IN_SECONDS - 5);
		});

		it('should pause the countdown while the tab is hidden', async () => {
			mockAuthStore();
			vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

			const { container } = render(VipQrCodeModal);

			await waitForInitialLoad();
			await tickSeconds(3);

			const beforeHidden = readCounter(container);

			vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
			document.dispatchEvent(new Event('visibilitychange'));
			await tick();

			await tickSeconds(5);

			expect(readCounter(container)).toBe(beforeHidden);
		});

		it('should keep a single timer when visibility flips on repeatedly', async () => {
			mockAuthStore();
			vi.spyOn(rewardApi, 'getNewVipReward').mockResolvedValue(mockedNewRewardResponse);

			const { container } = render(VipQrCodeModal);

			await waitForInitialLoad();

			const hiddenSpy = vi.spyOn(document, 'hidden', 'get');

			// Multiple redundant "visible" events must not spawn extra timers.
			for (let i = 0; i < 3; i++) {
				hiddenSpy.mockReturnValue(false);
				document.dispatchEvent(new Event('visibilitychange'));
				await tick();
			}

			await tickSeconds(5);

			expect(readCounter(container)).toBe(CODE_REGENERATE_INTERVAL_IN_SECONDS - 5);
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
			expect(qrCodeURL?.textContent).includes(mockedNewRewardResponse.VipReward.code);

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

			expect(reloadedQrCodeUrl?.textContent).includes(regeneratedNewRewardResponse.VipReward.code);
		});
	});
});
