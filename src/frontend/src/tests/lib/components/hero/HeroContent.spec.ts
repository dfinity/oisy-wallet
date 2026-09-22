import HeroContent from '$lib/components/hero/HeroContent.svelte';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import * as networkDerived from '$lib/derived/network.derived';
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
});
