import PayHero from '$lib/components/scanner/PayHero.svelte';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('PayHero', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render payment amount and asset', () => {
		const { container } = render(PayHero, {
			amount: 100,
			asset: 'CHF',
			receipt: 'Test Shop'
		});

		const amountElement = container.querySelector('data[value="100"]');

		expect(amountElement).toBeInTheDocument();
		expect(amountElement?.textContent?.trim()).toBe('100');

		const output = container.querySelector('output');

		expect(output?.textContent).toContain('100');
		expect(output?.textContent).toContain('CHF');
	});

	it('should render receipt name in header', () => {
		const { getByText } = render(PayHero, {
			amount: 50,
			asset: 'EUR',
			receipt: 'Coffee Shop'
		});

		const payTo = replacePlaceholders(en.scanner.text.pay_to, {
			$receipt: 'Coffee Shop'
		});

		expect(getByText(payTo)).toBeInTheDocument();
	});

	it('should render with string amount', () => {
		const { container } = render(PayHero, {
			amount: '99.99',
			asset: 'USD',
			receipt: 'Online Store'
		});

		const amountElement = container.querySelector('data[value="99.99"]');

		expect(amountElement).toBeInTheDocument();
		expect(amountElement?.textContent?.trim()).toBe('99.99');
	});

	it('should render with decimal amount', () => {
		const { container } = render(PayHero, {
			amount: 123.45,
			asset: 'BTC',
			receipt: 'Crypto Store'
		});

		const output = container.querySelector('output');

		expect(output?.textContent).toContain('123.45');
		expect(output?.textContent).toContain('BTC');
	});

	it('should display "Powered by" text with OpenCryptoPay icon', () => {
		const { getByText } = render(PayHero, {
			amount: 10,
			asset: 'CHF',
			receipt: 'Test'
		});

		expect(getByText(en.scanner.text.powered_by)).toBeInTheDocument();
	});

	it('should handle different asset types', () => {
		const assets = ['CHF', 'EUR', 'USD', 'BTC', 'ETH'];

		assets.forEach((asset) => {
			const { container } = render(PayHero, {
				amount: 100,
				asset,
				receipt: 'Test Shop'
			});

			const output = container.querySelector('output');

			expect(output?.textContent).toContain(asset);
		});
	});
});
