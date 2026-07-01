import LiquidiumProviderHero from '$lib/components/liquidium/LiquidiumProviderHero.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	goto: vi.fn()
}));

describe('LiquidiumProviderHero', () => {
	const props = {
		logo: '/images/dapps/liquidium-logo.webp',
		pageTitle: 'Liquidium',
		pageDescription: 'Lend & borrow native assets.',
		url: 'https://liquidium.fi',
		portfolio: null
	};

	it('renders the title, description and learn-more link', () => {
		const { container } = render(LiquidiumProviderHero, { props });

		expect(container).toHaveTextContent('Liquidium');
		expect(container).toHaveTextContent('Lend & borrow native assets.');
		expect(container).toHaveTextContent(en.core.text.learn_more);
	});

	it('hides the summary and learn-more link when showSummary is false', () => {
		const { container } = render(LiquidiumProviderHero, {
			props: { ...props, showSummary: false }
		});

		expect(container).not.toHaveTextContent(en.core.text.learn_more);
		expect(container).not.toHaveTextContent(en.liquidium.text.health_factor);
	});
});
