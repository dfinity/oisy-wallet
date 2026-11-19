import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import HeroContent from '$lib/components/hero/HeroContent.svelte';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import { AMOUNT_DATA } from '$lib/constants/test-ids.constants';
import * as networkDerived from '$lib/derived/network.derived';
import * as pageTokenDerived from '$lib/derived/page-token.derived';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('HeroContent', () => {
	// XRP is force-disabled in the test env, so `networkXrp` can never become true through the
	// page/network stores here — the store is spied on directly to exercise the hero styling.
	const mockXrpNetwork = (xrp: boolean) => {
		vi.spyOn(networkDerived, 'networkXrp', 'get').mockReturnValue(readable(xrp));
		vi.spyOn(networkDerived, 'pseudoNetworkChainFusion', 'get').mockReturnValue(readable(!xrp));
	};

	const renderHero = (): HTMLElement => {
		const { container } = render(HeroContent);
		const hero = container.querySelector('div');

		expect(hero).not.toBeNull();

		return hero as HTMLElement;
	};

	beforeEach(() => {
		vi.restoreAllMocks();

		mockPage.reset();
		mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Transactions}` });
	});

	describe('on the XRP network', () => {
		beforeEach(() => {
			mockXrpNetwork(true);
		});

		it('paints the XRP gradient', () => {
			const hero = renderHero();

			expect(hero.classList.contains('from-xrp-0')).toBeTruthy();
			expect(hero.classList.contains('to-xrp-100')).toBeTruthy();
		});

		it('keeps the default top-to-bottom direction', () => {
			const hero = renderHero();

			expect(hero.classList.contains('bg-linear-to-b')).toBeTruthy();
			expect(hero.classList.contains('bg-gradient-to-r')).toBeFalsy();
			expect(hero.classList.contains('bg-linear-105')).toBeFalsy();
		});

		it('does not fall back to the default blue gradient', () => {
			const hero = renderHero();

			expect(hero.classList.contains('from-default-0')).toBeFalsy();
			expect(hero.classList.contains('to-default-100')).toBeFalsy();
		});

		// The counterpart to the Robinhood case below: every other network still runs the gradient
		// window to its end stop, so holding it back is specific to Robinhood rather than general.
		it('runs the gradient window to the end stop', () => {
			const hero = renderHero();

			expect(hero.classList.contains('bg-pos-100')).toBeTruthy();
		});
	});

	describe('on Robinhood Chain', () => {
		beforeEach(() => {
			vi.spyOn(networkDerived, 'networkRobinhood', 'get').mockReturnValue(readable(true));
			vi.spyOn(networkDerived, 'pseudoNetworkChainFusion', 'get').mockReturnValue(readable(false));
		});

		it('paints the Robinhood gradient on its own steeper diagonal', () => {
			const hero = renderHero();

			expect(hero.classList.contains('from-robinhood-0')).toBeTruthy();
			expect(hero.classList.contains('to-robinhood-100')).toBeTruthy();
			expect(hero.classList.contains('bg-linear-135')).toBeTruthy();
			expect(hero.classList.contains('bg-linear-105')).toBeFalsy();
			expect(hero.classList.contains('bg-linear-to-b')).toBeFalsy();
		});

		// Without both stops the accent washes the whole card: the late start keeps the black
		// across most of it, and the end stop past 100% means the accent never reaches full
		// strength within the card, leaving it a corner bloom.
		it('starts the accent late and ends it past the card', () => {
			const hero = renderHero();

			expect(hero.classList.contains('from-55%')).toBeTruthy();
			expect(hero.classList.contains('to-[110%]')).toBeTruthy();
		});
	});

	describe('on another network', () => {
		beforeEach(() => {
			mockXrpNetwork(false);
		});

		it('does not paint the XRP gradient', () => {
			const hero = renderHero();

			expect(hero.classList.contains('from-xrp-0')).toBeFalsy();
			expect(hero.classList.contains('to-xrp-100')).toBeFalsy();
		});

		it('still paints the default gradient', () => {
			const hero = renderHero();

			expect(hero.classList.contains('from-default-0')).toBeTruthy();
			expect(hero.classList.contains('to-default-100')).toBeTruthy();
		});
	});

	// The global highlight is a light OISY blue tint, which disappears on the coloured heroes.
	describe('selection highlight', () => {
		const selectionScope = (element: Element | null): Element | null =>
			element?.closest('[class~="selection:bg-white"][class~="selection:text-brand-primary"]') ??
			null;

		it('turns selected hero text into a white block with blue text on a coloured hero', () => {
			const hero = renderHero();

			expect(selectionScope(hero.querySelector(`[data-tid="${AMOUNT_DATA}"]`))).not.toBeNull();
		});

		// Modals and popovers render where they are mounted, so a highlight on the card would
		// reach every modal the hero actions open.
		it('keeps the highlight off the card and the actions that mount modals', () => {
			const hero = renderHero();

			expect(hero.classList.contains('selection:bg-white')).toBeFalsy();
			expect(hero.classList.contains('selection:text-brand-primary')).toBeFalsy();

			const actions = hero.querySelector('[role="toolbar"]');

			expect(actions).not.toBeNull();
			expect(selectionScope(actions)).toBeNull();
		});

		it('keeps the global highlight on the light ICP hero', () => {
			vi.spyOn(pageTokenDerived, 'pageToken', 'get').mockReturnValue(readable(ICP_TOKEN));

			const hero = renderHero();

			expect(hero.classList.contains('bg-icp-token-hero-gradient')).toBeTruthy();
			expect(hero.querySelector('[class~="selection:bg-white"]')).toBeNull();
			expect(hero.querySelector('[class~="selection:text-brand-primary"]')).toBeNull();
		});
	});
});
