import * as cmcApi from '$icp/api/cmc.api';
import CyclesMintButton from '$icp/components/cycles-mint/CyclesMintButton.svelte';
import { CYCLES_MINT_BUTTON } from '$lib/constants/test-ids.constants';
import * as cyclesMintAnalytics from '$lib/services/cycles-mint-analytics.services';
import { HERO_CONTEXT_KEY, initHeroContext } from '$lib/stores/hero.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockTcyclesToken, mockXdrPermyriadPerIcp } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('CyclesMintButton', () => {
	const heroContext = () => {
		const context = initHeroContext();

		context.loading.set(false);

		return new Map<symbol, unknown>([[HERO_CONTEXT_KEY, context]]);
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		modalStore.close();

		vi.spyOn(cmcApi, 'getIcpXdrConversionRate').mockResolvedValue(mockXdrPermyriadPerIcp);
		vi.spyOn(cyclesMintAnalytics, 'trackCyclesMint').mockImplementation(() => undefined);
	});

	// The page's outflow state follows the TCYCLES balance: gating on it would lock minting
	// for exactly the users who have no TCYCLES yet.
	it('is enabled while the page’s outflow actions are disabled', () => {
		const { getByTestId } = render(CyclesMintButton, {
			props: { token: mockTcyclesToken },
			context: heroContext()
		});

		const button = getByTestId(CYCLES_MINT_BUTTON);

		expect(button).not.toBeDisabled();
		expect(button).toHaveTextContent(en.mint.text.mint);
		expect(button).toHaveAttribute('aria-label', 'Mint TCYCLES');
	});

	it('opens the Mint modal', async () => {
		const { container, getByTestId } = render(CyclesMintButton, {
			props: { token: mockTcyclesToken },
			context: heroContext()
		});

		await fireEvent.click(getByTestId(CYCLES_MINT_BUTTON));

		expect(get(modalStore)?.type).toBe('cycles-mint');
		expect(container).toHaveTextContent(en.cycles_mint.text.you_mint_estimate);
	});
});
