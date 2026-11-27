import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import AddTokenByNetwork from '$lib/components/manage/AddTokenByNetwork.svelte';
import type { Network } from '$lib/types/network';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, screen } from '@testing-library/svelte';

describe('AddTokenByNetwork', () => {
	const renderComponent = ({
		network,
		networkSelectable = false
	}: { network?: Network; networkSelectable?: boolean } = {}) =>
		render(AddTokenByNetwork, {
			props: {
				network,
				networkSelectable,
				tokenData: {},
				onBack: vi.fn(),
				onNext: vi.fn()
			}
		});

	const networkOptions = (container: HTMLElement) =>
		Array.from(container.querySelectorAll<HTMLOptionElement>('select[name="network"] option')).map(
			({ textContent }) => textContent?.trim()
		);

	beforeEach(() => {
		mockPage.reset();
	});

	it('should say custom tokens are not supported yet when the XRP network is filtered', () => {
		mockPage.mock({ network: XRP_MAINNET_NETWORK.id.description });

		const { container } = renderComponent({ network: XRP_MAINNET_NETWORK });

		expect(container).toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
	});

	it('should say custom tokens are not supported when the Bitcoin network is filtered', () => {
		mockPage.mock({ network: BTC_MAINNET_NETWORK.id.description });

		const { container } = renderComponent({ network: BTC_MAINNET_NETWORK });

		expect(container).toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported);
		expect(container).not.toHaveTextContent(en.tokens.import.text.custom_tokens_not_supported_yet);
	});

	it('should say custom tokens are not supported yet when XRP is picked with all networks shown', () => {
		const { container } = renderComponent({ network: XRP_MAINNET_NETWORK });

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

	describe('networkSelectable', () => {
		it('should keep the page network fixed for Manage tokens', () => {
			mockPage.mock({ network: BTC_MAINNET_NETWORK.id.description });

			const { container } = renderComponent({ network: BTC_MAINNET_NETWORK });

			expect(container.querySelector('select[name="network"]')).not.toBeInTheDocument();
		});

		it('should let Receive pick a network on any page, never Bitcoin or XRP', () => {
			mockPage.mock({ network: BTC_MAINNET_NETWORK.id.description });

			const { container } = renderComponent({ networkSelectable: true });

			const options = networkOptions(container);

			expect(container.querySelector('select[name="network"]')).toBeInTheDocument();
			expect(options).toContain(ETHEREUM_NETWORK.name);
			expect(options).not.toContain(BTC_MAINNET_NETWORK.name);
			expect(options).not.toContain(XRP_MAINNET_NETWORK.name);
		});
	});
});
