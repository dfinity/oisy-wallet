import LiquidiumProviderHero from '$lib/components/liquidium/LiquidiumProviderHero.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	goto: vi.fn()
}));

describe('LiquidiumProviderHero', () => {
	const props = {
		logo: '/images/dapps/liquidium-logo.webp',
		pageTitle: 'Liquidium',
		pageDescription: 'Lend & borrow native assets.',
		portfolio: null,
		onLearnMore: vi.fn()
	};

	it('renders the title, description and learn-more link', () => {
		const { container } = render(LiquidiumProviderHero, { props });

		expect(container).toHaveTextContent('Liquidium');
		expect(container).toHaveTextContent('Lend & borrow native assets.');
		expect(container).toHaveTextContent(en.core.text.learn_more);
	});

	it('calls onLearnMore when the learn-more link is clicked', async () => {
		const onLearnMore = vi.fn();

		const { getByText } = render(LiquidiumProviderHero, { props: { ...props, onLearnMore } });

		await fireEvent.click(getByText(en.core.text.learn_more));

		expect(onLearnMore).toHaveBeenCalledOnce();
	});

	it('hides the summary when showSummary is false', () => {
		const { container } = render(LiquidiumProviderHero, {
			props: { ...props, showSummary: false }
		});

		expect(container).toHaveTextContent(en.core.text.learn_more);
		expect(container).not.toHaveTextContent(en.liquidium.text.health_factor);
	});
});
