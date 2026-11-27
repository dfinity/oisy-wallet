import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import SwapProviderListItem from '$lib/components/swap/SwapProviderListItem.svelte';
import { screensStore } from '$lib/stores/screens.store';
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
		isBestRate: false,
		onClick: vi.fn()
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

	it.each(['xs', 'md', 'xl'] as const)(
		'marks an estimate in the Best Rate slot, in the grey of the fiat value, on %s screens',
		(screen) => {
			screensStore.set(screen);

			const { getByText, queryByText } = render(SwapProviderListItem, {
				props: { ...baseProps, dapp: createDapp(), isEstimate: true }
			});

			const estimate = getByText(en.swap.text.estimate);
			const fiat = getByText('$5.00');

			expect(estimate.parentElement).toBe(fiat.parentElement);
			expect(estimate.compareDocumentPosition(fiat)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
			expect(estimate.closest('.text-tertiary')).toBe(fiat.closest('.text-tertiary'));
			expect(queryByText(en.swap.text.best_rate)).not.toBeInTheDocument();
		}
	);

	it('never shows Best Rate on an estimate', () => {
		screensStore.set('xl');

		const { container, queryByText } = render(SwapProviderListItem, {
			props: { ...baseProps, dapp: createDapp(), isBestRate: true, isEstimate: true }
		});

		expect(queryByText(en.swap.text.best_rate)).not.toBeInTheDocument();
		expect(container.querySelector('svg')).toBeNull();
	});

	it('shows Best Rate and no estimate on a protected offer', () => {
		screensStore.set('xl');

		const { getByText, queryByText } = render(SwapProviderListItem, {
			props: { ...baseProps, dapp: createDapp(), isBestRate: true }
		});

		expect(getByText(en.swap.text.best_rate)).toBeInTheDocument();
		expect(queryByText(en.swap.text.estimate)).not.toBeInTheDocument();
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
