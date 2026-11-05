import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import SwapProviderDetails from '$lib/components/swap/SwapProviderDetails.svelte';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import { SwapProvider } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock('$env/dapp-descriptions.env', () => ({
	dAppDescriptions: [
		{
			id: 'icpswap',
			name: 'ICP Swap',
			logo: 'https://example.com/icpswap-logo.png',
			website: 'https://www.icpswap.com'
		}
	]
}));

describe('SwapProviderDetails', () => {
	const context = new Map([
		[SWAP_CONTEXT_KEY, initSwapContext({ destinationToken: ICP_TOKEN as IcTokenToggleable })]
	]);

	const provider = {
		provider: SwapProvider.ICP_SWAP,
		receiveAmount: 100_000_000n,
		receiveOutMinimum: 95_000_000n,
		swapDetails: {} as ICPSwapAmountReply
	} as const;

	it('shows the website without www and the provider-specific details', () => {
		const { getByText } = render(SwapProviderDetails, {
			props: { provider, slippageValue: 5 },
			context
		});

		expect(getByText(en.swap.text.swap_provider_website)).toBeInTheDocument();
		expect(getByText('icpswap.com')).toBeInTheDocument();
		expect(getByText(en.swap.text.expected_minimum)).toBeInTheDocument();
		expect(getByText('0.95 ICP')).toBeInTheDocument();
	});

	it('leaves the website out on request and keeps the details', () => {
		const { getByText, queryByText } = render(SwapProviderDetails, {
			props: { provider, slippageValue: 5, showWebsite: false },
			context
		});

		expect(queryByText(en.swap.text.swap_provider_website)).not.toBeInTheDocument();
		expect(queryByText('icpswap.com')).not.toBeInTheDocument();
		expect(getByText('0.95 ICP')).toBeInTheDocument();
	});

	it('passes the slippage through to the provider details', () => {
		const { queryByText } = render(SwapProviderDetails, {
			props: { provider, slippageValue: undefined },
			context
		});

		expect(queryByText(en.swap.text.expected_minimum)).not.toBeInTheDocument();
	});
});
