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
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpAddress, mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import * as xrpAddTokenServices from '$xrp/services/xrp-add-token.services';
import * as xrpTrustLineTokensServices from '$xrp/services/xrp-trust-line-tokens.services';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';

vi.mock('$xrp/services/xrp-add-token.services', () => ({
	loadXrpAddTokenReview: vi.fn()
}));

vi.mock(import('$xrp/services/xrp-trust-line-tokens.services'), async (importOriginal) => ({
	...(await importOriginal()),
	addXrpTrustLineToken: vi.fn()
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

		describe('once reviewed', () => {
			const review = {
				token: { ...RLUSD_TOKEN, enabled: true },
				powers: [],
				fee: 12n,
				reserveAfter: 1_200_000n
			};

			const addRlusd = async () => {
				render(ManageTokensModal);

				const toggle = await rlusdToggle();
				await fireEvent.click(toggle.querySelector('input') as HTMLInputElement);

				const add = await screen.findByRole('button', {
					name: en.tokens.import.text.add_the_token
				});
				await waitFor(() => expect(add).toBeEnabled());
				await fireEvent.click(add);
			};

			beforeEach(() => {
				mockAuthStore();
				xrpAddressMainnetStore.set({ certified: true, data: mockXrpAddress });

				vi.mocked(xrpAddTokenServices.loadXrpAddTokenReview).mockResolvedValue({ review });
				// Moves the modal on and stays there, as a `TrustSet` being signed does.
				vi.mocked(xrpTrustLineTokensServices.addXrpTrustLineToken).mockImplementation(
					({ modalNext }) => {
						modalNext?.();
						return new Promise(() => {});
					}
				);
			});

			afterEach(() => {
				xrpAddressMainnetStore.reset();
			});

			it('adds the reviewed token with its fee, from the user’s address', async () => {
				await addRlusd();

				expect(xrpTrustLineTokensServices.addXrpTrustLineToken).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						identity: mockIdentity,
						source: mockXrpAddress,
						token: review.token,
						fee: review.fee
					})
				);
			});

			// Adding signs and sends a transaction, so the saving step names that — not a list save.
			it('shows the signing and sending steps while the token is added', async () => {
				await addRlusd();

				await expect(screen.findByText(en.send.text.signing_message)).resolves.toBeInTheDocument();
				expect(screen.getByText(en.send.text.sending)).toBeInTheDocument();
				expect(screen.queryByText(en.tokens.import.text.saving)).toBeNull();
			});
		});
	});
});
