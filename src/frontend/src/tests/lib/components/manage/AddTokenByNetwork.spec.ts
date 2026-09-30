import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
import type { Network } from '$lib/types/network';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, screen } from '@testing-library/svelte';

describe('AddTokenByNetwork', () => {
	const renderComponent = (network?: Network) =>
		render(AddTokenByNetwork, {
			props: {
				network,
				tokenData: {},
				onBack: vi.fn(),
				onNext: vi.fn()
			}
		});

	beforeEach(() => {
		mockPage.reset();
	});

	it('should say custom tokens are not supported yet when the XRP network is filtered', () => {
		mockPage.mock({ network: XRP_MAINNET_NETWORK.id.description });

		const { container } = renderComponent(XRP_MAINNET_NETWORK);

		expect(container).toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
	});

	it('should say custom tokens are not supported when the Bitcoin network is filtered', () => {
		mockPage.mock({ network: BTC_MAINNET_NETWORK.id.description });

		const { container } = renderComponent(BTC_MAINNET_NETWORK);

		expect(container).toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
	});

	it('should say custom tokens are not supported yet when XRP is picked with all networks shown', () => {
		const { container } = renderComponent(XRP_MAINNET_NETWORK);

		expect(container).toHaveTextContent(en.tokens.manage.text.network);
		expect(screen.getByRole('status')).toHaveTextContent(
			en.tokens.import.text.custom_tokens_not_supported_yet
		);
	});

	it('should show no unsupported-network text when no network is picked', () => {
		const { container } = renderComponent();

		expect(container).toHaveTextContent(en.tokens.manage.placeholder.select_network);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
	});

	it('should mount the status region before a network is picked', () => {
		renderComponent();

		expect(screen.getByRole('status')).toBeEmptyDOMElement();
	});

	describe('with XRP Ledger tokens on', () => {
		beforeEach(() => {
			vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(true);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('asks for the issuer and the currency code instead of saying "not yet"', () => {
			const { getByPlaceholderText } = renderComponent(XRP_MAINNET_NETWORK);

			expect(getByPlaceholderText(en.tokens.placeholder.enter_xrp_issuer)).toBeInTheDocument();
			expect(
				getByPlaceholderText(en.tokens.placeholder.enter_xrp_currency_code)
			).toBeInTheDocument();
			expect(screen.getByRole('status')).toBeEmptyDOMElement();
		});

		it('keeps the next step disabled until both are given', () => {
			const { getByRole } = render(AddTokenByNetwork, {
				props: {
					network: XRP_MAINNET_NETWORK,
					tokenData: { xrpIssuer: 'rIssuer' },
					onBack: vi.fn(),
					onNext: vi.fn()
				}
			});

			expect(getByRole('button', { name: en.core.text.next })).toBeDisabled();
		});

		it('enables the next step once both are given', () => {
			const { getByRole } = render(AddTokenByNetwork, {
				props: {
					network: XRP_MAINNET_NETWORK,
					tokenData: { xrpIssuer: 'rIssuer', xrpCurrency: 'USD' },
					onBack: vi.fn(),
					onNext: vi.fn()
				}
			});

			expect(getByRole('button', { name: en.core.text.next })).toBeEnabled();
		});
	});
});
