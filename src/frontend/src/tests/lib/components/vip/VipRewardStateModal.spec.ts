import * as icrcNetworks from '$env/networks/networks.icrc.env';
import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';
import { setCustomToken } from '$icp-eth/services/custom-token.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import failedVipReward from '$lib/assets/failed-vip-reward.svg';
import successfulBinanceReward from '$lib/assets/successful-binance-reward.svg';
import successfulVipReward from '$lib/assets/successful-vip-reward.svg';
import VipRewardStateModal from '$lib/components/vip/VipRewardStateModal.svelte';
import { VIP_STATE_BUTTON, VIP_STATE_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
import { QrCodeType } from '$lib/enums/qr-code-types';
import { autoLoadSingleToken } from '$lib/services/token.services';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mapLocalIcrcData } from '$tests/utils/map-icrc-data.test-utils';
import { nonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/token.services', () => ({
	autoLoadSingleToken: vi.fn()
}));

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
			expect(
				getByText(get(i18n).vip.reward.text.brand_reward_received_description)
			).toBeInTheDocument();
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
		const additionalIcrcData = mapLocalIcrcData(additionalIcrcTokens);
		const goldToken = nonNullish(additionalIcrcData?.GLDT)
			? {
					...additionalIcrcData.GLDT,
					position: 16
				}
			: undefined;

		const mockIcrcDefaultToken: IcToken = {
			...mockValidIcToken,
			ledgerCanisterId: goldToken?.ledgerCanisterId ?? 'mxzaz-hqaaa-aaaar-qaada-cai'
		};

		const mockIcrcCustomToken: IcrcCustomToken = {
			...mockValidIcToken,
			ledgerCanisterId: goldToken?.ledgerCanisterId ?? 'mxzaz-hqaaa-aaaar-qaada-cai',
			enabled: false
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			icrcDefaultTokensStore.resetAll();
			icrcDefaultTokensStore.set({ data: mockIcrcDefaultToken, certified: false });

			icrcCustomTokensStore.resetAll();

			vi.spyOn(icrcNetworks, 'GLDT_IC_DATA', 'get').mockImplementation(() => goldToken);
		});

		it('should auto-enable GLDT token for Gold campaign and undefined token', () => {
			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.GOLD
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);

			expect(button).toBeInTheDocument();

			button?.click();

			expect(autoLoadSingleToken).toHaveBeenCalledOnce();
			expect(autoLoadSingleToken).toHaveBeenNthCalledWith(1, {
				token: expect.objectContaining({
					...mockIcrcDefaultToken,
					enabled: false
				}),
				identity: mockIdentity,
				setToken: setCustomToken,
				loadTokens: loadCustomTokens,
				errorMessage: en.init.error.icrc_custom_token
			});
		});

		it('should auto-enable GLDT token for Gold campaign and disabled token', () => {
			icrcCustomTokensStore.set({ data: mockIcrcCustomToken, certified: false });

			const { container } = render(VipRewardStateModal, {
				isSuccessful: true,
				codeType: QrCodeType.GOLD
			});

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);

			expect(button).toBeInTheDocument();

			button?.click();

			expect(autoLoadSingleToken).toHaveBeenCalledOnce();
			expect(autoLoadSingleToken).toHaveBeenNthCalledWith(1, {
				token: expect.objectContaining({
					...mockIcrcDefaultToken,
					enabled: false
				}),
				identity: mockIdentity,
				setToken: setCustomToken,
				loadTokens: loadCustomTokens,
				errorMessage: en.init.error.icrc_custom_token
			});
		});

		it('should not open manage tokens modal for Gold campaign and enabled token', async () => {
			icrcCustomTokensStore.set({
				data: { ...mockIcrcCustomToken, enabled: true },
				certified: false
			});

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
			icrcCustomTokensStore.set({
				data: { ...mockIcrcCustomToken, enabled: true },
				certified: false
			});

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
