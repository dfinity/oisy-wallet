import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import SwapProviderListItem from '$lib/components/swap/SwapProviderListItem.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('SwapProviderListItem', () => {
	const baseProps = {
		amount: 123_000_000n,
		destinationToken: mockValidIcToken as IcTokenToggleable,
		usdBalance: '$5.00',
		logoSize: 'md' as const,
		isBestRate: false
	};

	const createDapp = (overrides = {}) => ({
		id: 'test-dapp',
		name: 'TestSwap',
		logo: '/logo.svg',
		website: 'https://www.testswap.com',
		oneLiner: 'One-liner',
		tags: ['DeFi'],
		description: 'Test description',
		stats: 'Stats',
		usesInternetIdentity: false,
		...overrides
	});

	it('renders dapp name, displayURL, logo, amount and usdBalance', async () => {
		const dapp = createDapp();

		const { getByText, getByAltText } = render(SwapProviderListItem, {
			props: {
				...baseProps,
				dapp
			}
		});

		await tick();

		expect(getByText('TestSwap')).toBeInTheDocument();
		expect(getByText('testswap.com')).toBeInTheDocument();
		expect(getByAltText('Logo of TestSwap')).toBeInTheDocument();
		expect(getByText('1.23')).toBeInTheDocument();
		expect(getByText('$5.00')).toBeInTheDocument();
	});

	it('does not render displayURL if website is invalid', async () => {
		const dapp = createDapp({ website: 'not-a-valid-url' });

		const { queryByText } = render(SwapProviderListItem, {
			props: { ...baseProps, dapp }
		});

		await tick();

		expect(queryByText('not-a-valid-url')).not.toBeInTheDocument();
	});

	it('does not render displayURL if website is missing', async () => {
		const dapp = createDapp({ website: undefined });

		const { queryByText } = render(SwapProviderListItem, {
			props: { ...baseProps, dapp }
		});

		await tick();

		expect(queryByText('testswap.com')).not.toBeInTheDocument();
	});

	it('renders formatted amount based on decimals', () => {
		const dapp = createDapp();

		const { getByText } = render(SwapProviderListItem, {
			props: {
				...baseProps,
				amount: 456_000_000n,
				dapp
			}
		});

		expect(getByText('4.56')).toBeInTheDocument();
	});

	it('renders usdBalance always', () => {
		const dapp = createDapp();

		const { getByText } = render(SwapProviderListItem, {
			props: {
				...baseProps,
				usdBalance: '$12.34',
				dapp
			}
		});

		expect(getByText('$12.34')).toBeInTheDocument();
	});

	it('renders fallback text if usdBalance is undefined', () => {
		const dapp = createDapp();

		const { getByText } = render(SwapProviderListItem, {
			props: {
				...baseProps,
				usdBalance: undefined,
				dapp
			}
		});

		expect(getByText(en.tokens.text.exchange_is_not_available_short)).toBeInTheDocument();
	});
});
