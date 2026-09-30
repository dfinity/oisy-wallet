import { XRP_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import * as toastsStore from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';
import {
	mockRlusdIssuer,
	mockXrpAddress,
	mockXrpAddress2,
	mockXrpTrustLine
} from '$tests/mocks/xrp.mock';
import XrpAddTokenReview from '$xrp/components/tokens/XrpAddTokenReview.svelte';
import type {
	XrpAddTokenRefusal,
	XrpAddTokenReview as XrpAddTokenReviewData
} from '$xrp/services/xrp-add-token.services';
import * as xrpAddTokenServices from '$xrp/services/xrp-add-token.services';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$xrp/services/xrp-add-token.services', () => ({
	loadXrpAddTokenReview: vi.fn()
}));

describe('XrpAddTokenReview', () => {
	const review: XrpAddTokenReviewData = {
		token: { ...RLUSD_TOKEN, enabled: true },
		powers: [{ type: 'freeze' }, { type: 'clawback' }],
		fee: 12n,
		reserveAfter: 1_200_000n
	};

	const props = {
		network: XRP_MAINNET_NETWORK,
		currency: 'RLUSD',
		issuer: mockRlusdIssuer,
		onBack: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();

		xrpAddressMainnetStore.set({ certified: true, data: mockXrpAddress });
		xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine] });

		vi.mocked(xrpAddTokenServices.loadXrpAddTokenReview).mockResolvedValue({ review });
	});

	afterEach(() => {
		xrpAddressMainnetStore.reset();
		xrpTrustLinesStore.clear(XRP_TOKEN.id);
	});

	it('checks the typed token against the user’s address and the account’s lines', async () => {
		render(XrpAddTokenReview, { props });

		await waitFor(() => {
			expect(xrpAddTokenServices.loadXrpAddTokenReview).toHaveBeenCalledExactlyOnceWith({
				currency: 'RLUSD',
				issuer: mockRlusdIssuer,
				address: mockXrpAddress,
				lines: [mockXrpTrustLine],
				network: XRP_MAINNET_NETWORK
			});
		});
	});

	it('shows the token, its issuer with an explorer link, and what the issuer can do', async () => {
		const { getByText, container } = render(XrpAddTokenReview, { props });

		await waitFor(() => expect(getByText(RLUSD_TOKEN.symbol)).toBeInTheDocument());

		const link = container.querySelector(
			`a[href="${XRP_MAINNET_EXPLORER_URL}/account/${mockRlusdIssuer}"]`
		);

		expect(link).toHaveTextContent(mockRlusdIssuer);

		expect(getByText(en.tokens.import.xrp_issuer_power.freeze)).toBeInTheDocument();
		expect(getByText(en.tokens.import.xrp_issuer_power.clawback)).toBeInTheDocument();
	});

	it('states the reserve the token keeps and the account’s reserve after adding', async () => {
		const { getByText } = render(XrpAddTokenReview, { props });

		await waitFor(() =>
			expect(
				getByText(en.tokens.import.text.xrp_reserve.replace('$amount', '0.2'))
			).toBeInTheDocument()
		);

		expect(
			getByText(en.tokens.import.text.xrp_reserve_after.replace('$amount', '1.2'))
		).toBeInTheDocument();
	});

	it('states a transfer fee as a percentage', async () => {
		vi.mocked(xrpAddTokenServices.loadXrpAddTokenReview).mockResolvedValue({
			review: { ...review, powers: [{ type: 'transfer_fee', percent: 0.5 }] }
		});

		const { getByText } = render(XrpAddTokenReview, { props });

		await waitFor(() =>
			expect(
				getByText(en.tokens.import.xrp_issuer_power.transfer_fee.replace('$fee', '0.5'))
			).toBeInTheDocument()
		);
	});

	it('warns when the token shares a listed token’s code under another issuer', async () => {
		vi.mocked(xrpAddTokenServices.loadXrpAddTokenReview).mockResolvedValue({
			review: {
				...review,
				token: { ...RLUSD_TOKEN, issuer: mockXrpAddress2, enabled: true },
				lookalike: RLUSD_TOKEN
			}
		});

		const { getByText } = render(XrpAddTokenReview, { props });

		await waitFor(() =>
			expect(
				getByText(
					en.tokens.import.warning.xrp_not_listed_token
						.replaceAll('$symbol', 'RLUSD')
						.replace('$oisy_short', 'OISY')
						.replace('$issuer', 'rMxCK...8m5De')
				)
			).toBeInTheDocument()
		);
	});

	it('does not warn about a listed token otherwise', async () => {
		const { getByText, queryByText } = render(XrpAddTokenReview, { props });

		await waitFor(() => expect(getByText(RLUSD_TOKEN.symbol)).toBeInTheDocument());

		expect(queryByText(/that OISY lists/)).toBeNull();
	});

	it('does not add the token yet', async () => {
		const { getByText } = render(XrpAddTokenReview, { props });

		await waitFor(() => expect(getByText(RLUSD_TOKEN.symbol)).toBeInTheDocument());

		expect(getByText(en.tokens.import.text.add_the_token).closest('button')).toBeDisabled();
	});

	it.each<{ refusal: XrpAddTokenRefusal; text: string; reserve?: bigint }>([
		{ refusal: 'invalid_currency_code', text: en.tokens.import.error.xrp_invalid_currency_code },
		{ refusal: 'invalid_issuer', text: en.tokens.import.error.xrp_invalid_issuer },
		{ refusal: 'issuer_is_own_address', text: en.tokens.import.error.xrp_issuer_is_own_address },
		{ refusal: 'already_added', text: en.tokens.error.already_available },
		{ refusal: 'issuer_not_found', text: en.tokens.import.error.xrp_issuer_not_found },
		{
			refusal: 'issuer_disallows_trust_lines',
			text: en.tokens.import.error.xrp_issuer_disallows_trust_lines
		},
		{
			refusal: 'account_not_found',
			text: en.tokens.import.error.xrp_account_not_found.replace('$amount', '1')
		},
		{ refusal: 'insufficient_fee', text: en.tokens.import.error.xrp_insufficient_fee },
		{
			refusal: 'insufficient_reserve',
			reserve: 1_600_000n,
			text: en.tokens.import.error.xrp_insufficient_reserve.replace('$amount', '1.6')
		},
		{ refusal: 'state_unavailable', text: en.tokens.import.error.xrp_state_unavailable }
	])('says why for $refusal and goes back', async ({ refusal, reserve, text }) => {
		vi.mocked(xrpAddTokenServices.loadXrpAddTokenReview).mockResolvedValue({ refusal, reserve });
		const toastsSpy = vi.spyOn(toastsStore, 'toastsError');

		render(XrpAddTokenReview, { props });

		await waitFor(() => expect(props.onBack).toHaveBeenCalledOnce());

		expect(toastsSpy).toHaveBeenCalledExactlyOnceWith({ msg: { text } });
	});
});
