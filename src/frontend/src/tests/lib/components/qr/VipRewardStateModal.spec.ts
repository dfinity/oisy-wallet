import failedVipReward from '$lib/assets/failed-vip-reward.svg';
import successfulBinanceReward from '$lib/assets/successful-binance-reward.svg';
import successfulVipReward from '$lib/assets/successful-vip-reward.svg';
import VipRewardStateModal from '$lib/components/qr/VipRewardStateModal.svelte';
import {VIP_STATE_BUTTON, VIP_STATE_IMAGE_BANNER} from '$lib/constants/test-ids.constants';
import { QrCodeType } from '$lib/enums/qr-code-types';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import {render, waitFor} from '@testing-library/svelte';
import { get } from 'svelte/store';
import {modalStore} from "$lib/stores/modal.store";
import {mockValidIcToken} from "$tests/mocks/ic-tokens.mock";
import {icrcCustomTokensStore} from "$icp/stores/icrc-custom-tokens.store";
import type {IcrcCustomToken} from "$icp/types/icrc-custom-token";

describe('VipRewardStateModal', () => {
	const imageBannerSelector = `img[data-tid=${VIP_STATE_IMAGE_BANNER}]`;
	const buttonSelector = `button[data-tid=${VIP_STATE_BUTTON}]`;

	describe('VIP type', () => {
		it('should render expected texts in the positive case', () => {
			const { container, getByText } = render(VipRewardStateModal, { isSuccessful: true });

			const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

			expect(imageBanner).toBeInTheDocument();
			expect(imageBanner?.src).includes(successfulVipReward);

			expect(getByText(get(i18n).vip.reward.text.title_successful)).toBeInTheDocument();
			expect(
				getByText(replaceOisyPlaceholders(get(i18n).vip.reward.text.reward_received))
			).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.reward_received_description)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
		});

		it('should render expected texts in the negative case', () => {
			const { container, getByText } = render(VipRewardStateModal, { isSuccessful: false });

			const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

			expect(imageBanner).toBeInTheDocument();
			expect(imageBanner?.src).includes(failedVipReward);

			expect(getByText(get(i18n).vip.reward.text.title_failed)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.reward_failed)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.reward_failed_description)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
		});
	});

	describe('Gold type', () => {
		it('should render expected texts in the positive case', () => {
			const { container, getByText } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.GOLD
			});

			const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

			expect(imageBanner).toBeInTheDocument();
			expect(imageBanner?.src).includes(successfulBinanceReward);

			expect(getByText(get(i18n).vip.reward.text.title_successful)).toBeInTheDocument();
			expect(
				getByText(replaceOisyPlaceholders(get(i18n).vip.reward.text.reward_received))
			).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.reward_received_description)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
		});

		it('should render expected texts in the negative case', () => {
			const { container, getByText } = render(VipRewardStateModal, {
				isSuccessful: false,
				codeType: QrCodeType.GOLD
			});

			const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

			expect(imageBanner).toBeInTheDocument();
			expect(imageBanner?.src).includes(failedVipReward);

			expect(getByText(get(i18n).vip.reward.text.title_failed)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.reward_failed)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.reward_failed_description)).toBeInTheDocument();
			expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
		});
	});

	describe('Handle token state', () => {
		const goldTokenSymbol = 'GLDT';
		const mockIcrcCustomToken: IcrcCustomToken = {
			...mockValidIcToken,
			symbol: goldTokenSymbol,
			enabled: false
		};

		beforeEach(() => {
			icrcCustomTokensStore.resetAll();
		});

		it('should open manage tokens modal for Gold campaign and undefined token', async () => {
			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.GOLD
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
			expect(button).toBeInTheDocument();

			await waitFor(() => {
				button?.click();

				expect(get(modalStore)).toEqual({
					data: { initialSearch: goldTokenSymbol, message: replaceOisyPlaceholders(get(i18n).tokens.manage.text.default_message) },
					type: 'manage-tokens'
				});
			});
		});

		it('should open manage tokens modal for Gold campaign and disabled token', async () => {
			icrcCustomTokensStore.set({ data: mockIcrcCustomToken, certified: false });

			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.GOLD
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
			expect(button).toBeInTheDocument();

			await waitFor(() => {
				button?.click();

				expect(get(modalStore)).toEqual({
					data: { initialSearch: goldTokenSymbol, message: replaceOisyPlaceholders(get(i18n).tokens.manage.text.default_message) },
					type: 'manage-tokens'
				});
			});
		});

		it('should not open manage tokens modal for Gold campaign and enabled token', async () => {
			icrcCustomTokensStore.set({ data: {...mockIcrcCustomToken, enabled: true}, certified: false });

			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.GOLD
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
			expect(button).toBeInTheDocument();

			await waitFor(() => {
				button?.click();

				expect(get(modalStore)).toBeNull();
			});
		});

		it('should not open manage tokens modal for VIP campaign and undefined token', async () => {
			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.VIP
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
			expect(button).toBeInTheDocument();

			await waitFor(() => {
				button?.click();

				expect(get(modalStore)).toBeNull();
			});
		});

		it('should not open manage tokens modal for VIP campaign and disabled token', async () => {
			icrcCustomTokensStore.set({ data: mockIcrcCustomToken, certified: false });

			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.VIP
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
			expect(button).toBeInTheDocument();

			await waitFor(() => {
				button?.click();

				expect(get(modalStore)).toBeNull();
			});
		});

		it('should not open manage tokens modal for VIP campaign and enabled token', async () => {
			icrcCustomTokensStore.set({ data: {...mockIcrcCustomToken, enabled: true}, certified: false });

			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.VIP
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
			expect(button).toBeInTheDocument();

			await waitFor(() => {
				button?.click();

				expect(get(modalStore)).toBeNull();
			});
		});
	});
});
