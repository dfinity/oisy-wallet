import Balance from '$lib/components/hero/Balance.svelte';
import { AMOUNT_DATA } from '$lib/constants/test-ids.constants';
import * as settingsDerived from '$lib/derived/settings.derived';
import { HERO_CONTEXT_KEY, initHeroContext, type HeroContext } from '$lib/stores/hero.store';
import type { TokenUi } from '$lib/types/token-ui';
import * as privacyUtils from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('Balance', () => {
	let mockHeroContext: HeroContext;

	const mockToken: TokenUi = {
		...mockValidToken,
		balance: 123_456_789n,
		usdBalance: 1.23
	};

	const renderComponent = (token: TokenUi = mockToken) =>
		render(Balance, {
			props: { token },
			context: new Map([[HERO_CONTEXT_KEY, mockHeroContext]])
		});

	const mockPrivacyMode = (enabled: boolean) =>
		vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(readable(enabled));

	beforeEach(() => {
		vi.restoreAllMocks();

		mockHeroContext = initHeroContext();
		mockHeroContext.loading.set(false);

		mockPrivacyMode(false);
	});

	describe('privacy mode toggle', () => {
		it('should toggle privacy mode on when double-clicking the amount', async () => {
			const setPrivacyModeSpy = vi
				.spyOn(privacyUtils, 'setPrivacyMode')
				.mockImplementation(() => undefined);

			const { getByTestId } = renderComponent();

			await fireEvent.dblClick(getByTestId(AMOUNT_DATA));

			expect(setPrivacyModeSpy).toHaveBeenCalledExactlyOnceWith({
				enabled: true,
				withToast: false,
				source: 'Hero - Double click on the Balance amount'
			});
		});

		it('should toggle privacy mode off when double-clicking the hidden amount', async () => {
			mockPrivacyMode(true);

			const setPrivacyModeSpy = vi
				.spyOn(privacyUtils, 'setPrivacyMode')
				.mockImplementation(() => undefined);

			const { getByTestId } = renderComponent();

			await fireEvent.dblClick(getByTestId(AMOUNT_DATA));

			expect(setPrivacyModeSpy).toHaveBeenCalledExactlyOnceWith({
				enabled: false,
				withToast: false,
				source: 'Hero - Double click on the Balance amount'
			});
		});

		it('should toggle privacy mode when double-clicking the amount while the balance is loading', async () => {
			mockHeroContext.loading.set(true);

			const setPrivacyModeSpy = vi
				.spyOn(privacyUtils, 'setPrivacyMode')
				.mockImplementation(() => undefined);

			const { getByTestId } = renderComponent({ ...mockToken, balance: undefined });

			await fireEvent.dblClick(getByTestId(AMOUNT_DATA));

			expect(setPrivacyModeSpy).toHaveBeenCalledExactlyOnceWith({
				enabled: true,
				withToast: false,
				source: 'Hero - Double click on the Balance amount'
			});
		});

		it('should toggle privacy mode when double-clicking the subtitle', async () => {
			const setPrivacyModeSpy = vi
				.spyOn(privacyUtils, 'setPrivacyMode')
				.mockImplementation(() => undefined);

			const { getByRole } = renderComponent();

			await fireEvent.dblClick(getByRole('button', { name: en.hero.alt.toggle_privacy_mode }));

			expect(setPrivacyModeSpy).toHaveBeenCalledExactlyOnceWith({
				enabled: true,
				withToast: false,
				source: 'Hero - Double click on the Balance'
			});
		});
	});
});
