import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
import {
	MANAGE_TOKENS_MODAL_SAVE,
	MANAGE_TOKENS_MODAL_TOKEN_TOGGLE
} from '$lib/constants/test-ids.constants';
import { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import * as xrpAddTokenServices from '$xrp/services/xrp-add-token.services';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';

vi.mock('$xrp/services/xrp-add-token.services', () => ({
	loadXrpAddTokenReview: vi.fn()
}));

describe('ManageTokensModal', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('should open the import step with the initial Ethereum token address', async () => {
		render(ManageTokensModal, {
			props: {
				initialNetwork: ETHEREUM_NETWORK,
				initialTokenData: {
					ethContractAddress: mockEthAddress3
				},
				initialStep: WizardStepsManageTokens.IMPORT
			}
		});

		await expect(screen.findByText(en.tokens.import.text.title)).resolves.toBeInTheDocument();
		await expect(screen.findByDisplayValue(mockEthAddress3)).resolves.toBeInTheDocument();
	});

	describe('the RLUSD switch', () => {
		const rlusdToggle = () =>
			screen.findByTestId(
				`${MANAGE_TOKENS_MODAL_TOKEN_TOGGLE}-${RLUSD_TOKEN.symbol}-${XRP_MAINNET_NETWORK.id.description}`
			);

		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(true);
			// Never settles: the review stays on its loading state, which is all these cases look at.
			vi.mocked(xrpAddTokenServices.loadXrpAddTokenReview).mockReturnValue(new Promise(() => {}));

			xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [] });
		});

		afterEach(() => {
			vi.restoreAllMocks();
			xrpTrustLinesStore.clear(XRP_TOKEN.id);
		});

		it('opens the review of RLUSD at once instead of joining the Save', async () => {
			render(ManageTokensModal);

			const toggle = await rlusdToggle();
			await fireEvent.click(toggle.querySelector('input') as HTMLInputElement);

			await expect(screen.findByText(en.tokens.import.text.review)).resolves.toBeInTheDocument();
			expect(xrpAddTokenServices.loadXrpAddTokenReview).toHaveBeenCalledWith(
				expect.objectContaining({
					currency: RLUSD_TOKEN.currency,
					issuer: RLUSD_TOKEN.issuer,
					network: XRP_MAINNET_NETWORK
				})
			);
		});

		it('joins the Save like any other switch once RLUSD is held', async () => {
			xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine] });

			render(ManageTokensModal);

			const toggle = await rlusdToggle();
			await fireEvent.click(toggle.querySelector('input') as HTMLInputElement);

			expect(screen.getByTestId(MANAGE_TOKENS_MODAL_SAVE)).toBeEnabled();
			expect(xrpAddTokenServices.loadXrpAddTokenReview).not.toHaveBeenCalled();
		});

		it('goes back to the list from that review, not to the import form', async () => {
			render(ManageTokensModal);

			const toggle = await rlusdToggle();
			await fireEvent.click(toggle.querySelector('input') as HTMLInputElement);

			await fireEvent.click(await screen.findByRole('button', { name: en.core.text.back }));

			await waitFor(() =>
				expect(screen.getByText(en.tokens.manage.text.title)).toBeInTheDocument()
			);

			expect(screen.queryByPlaceholderText(en.tokens.placeholder.enter_xrp_issuer)).toBeNull();
		});
	});
});
