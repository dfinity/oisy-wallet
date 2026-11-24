import { i18n } from '$lib/stores/i18n.store';
import { landingSectionLinks } from '$lib/utils/landing.utils';
import { get } from 'svelte/store';

describe('landing.utils', () => {
	describe('landingSectionLinks', () => {
		it('links the four landing sections in page order', () => {
			const $i18n = get(i18n);

			expect(landingSectionLinks($i18n)).toEqual([
				{ href: '#landing-hold', label: $i18n.navigation.text.tokens },
				{ href: '#landing-security', label: $i18n.auth.landing.security_eyebrow },
				{ href: '#landing-swap', label: $i18n.swap.text.swap },
				{ href: '#landing-borrow', label: $i18n.auth.landing.borrow_eyebrow }
			]);
		});
	});
});
