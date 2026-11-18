import LandingWalletPreview from '$lib/components/auth/LandingWalletPreview.svelte';
import { Languages } from '$lib/enums/languages';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('LandingWalletPreview', () => {
	it('increases the balance four times as the example token rows appear', () => {
		const { container } = render(LandingWalletPreview);
		const amounts = Array.from(
			container.querySelectorAll<SVGTextElement>('.portfolio-balance text')
		);
		const rows = Array.from(container.querySelectorAll<SVGGElement>('.token-row'));

		expect(amounts.map(({ textContent }) => textContent)).toEqual([
			'$0.00',
			'$5,249.84',
			'$16,958.22',
			'$21,946.79',
			'$28,406.15'
		]);
		expect(amounts.slice(1).map(({ style }) => style.getPropertyValue('--balance-start'))).toEqual(
			[rows[0], rows[1], rows[2], rows[4]].map(({ style }) =>
				style.getPropertyValue('--token-delay')
			)
		);
	});

	describe('localized labels', () => {
		const measureText = vi.fn(function (this: SVGTextElement) {
			return this.textContent === get(i18n).networks.chain_fusion ? 110 : 20;
		});

		const mockPendingFonts = () => {
			let resolveFonts: () => void = () => {};
			const ready = new Promise<void>((resolve) => {
				resolveFonts = resolve;
			});

			Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });

			return async () => {
				resolveFonts();
				await ready;
			};
		};

		beforeEach(async () => {
			measureText.mockClear();
			Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
				configurable: true,
				value: measureText
			});
			Object.defineProperty(SVGSVGElement.prototype, 'width', {
				configurable: true,
				get(this: SVGSVGElement) {
					return { baseVal: { value: Number(this.getAttribute('width')) } };
				}
			});
			await i18n.switchLang(Languages.JAPANESE);
		});

		afterEach(async () => {
			Reflect.deleteProperty(document, 'fonts');
			Reflect.deleteProperty(SVGElement.prototype, 'getComputedTextLength');
			Reflect.deleteProperty(SVGSVGElement.prototype, 'width');
			await i18n.switchLang(Languages.ENGLISH);
		});

		it('fits only overflowing labels after fonts load and clears the fit in English', async () => {
			const resolveFonts = mockPendingFonts();
			const { getAllByText, getByText } = render(LandingWalletPreview);
			const [triggerLabel, menuLabel] = getAllByText(get(i18n).networks.chain_fusion);
			const fittingLabel = getByText('Bitcoin', { selector: 'svg[overflow="hidden"] > text' });

			expect(measureText).not.toHaveBeenCalled();
			expect(triggerLabel).not.toHaveAttribute('textLength');

			await resolveFonts();

			expect(triggerLabel).toHaveAttribute('textLength', '100');
			expect(menuLabel).toHaveAttribute('textLength', '94');
			expect(triggerLabel).toHaveAttribute('lengthAdjust', 'spacingAndGlyphs');
			expect(fittingLabel).not.toHaveAttribute('textLength');
			expect(fittingLabel).not.toHaveAttribute('lengthAdjust');

			measureText.mockClear();
			await i18n.switchLang(Languages.ENGLISH);
			await tick();

			for (const label of [triggerLabel, menuLabel]) {
				expect(label).toHaveTextContent(get(i18n).networks.chain_fusion);
				expect(label).not.toHaveAttribute('textLength');
				expect(label).not.toHaveAttribute('lengthAdjust');
			}

			expect(measureText).not.toHaveBeenCalled();
		});

		it('ignores stale font readiness after a language change', async () => {
			const resolveJapaneseFonts = mockPendingFonts();
			const { getAllByText } = render(LandingWalletPreview);
			const resolveGermanFonts = mockPendingFonts();
			await i18n.switchLang(Languages.GERMAN);
			await tick();
			const [triggerLabel] = getAllByText(get(i18n).networks.chain_fusion);

			await resolveJapaneseFonts();

			expect(measureText).not.toHaveBeenCalled();
			expect(triggerLabel).not.toHaveAttribute('textLength');

			await resolveGermanFonts();

			expect(triggerLabel).toHaveAttribute('textLength', '100');
		});

		it('skips measurements when unmounted before fonts load', async () => {
			const resolveFonts = mockPendingFonts();
			const { unmount } = render(LandingWalletPreview);
			unmount();

			await resolveFonts();

			expect(measureText).not.toHaveBeenCalled();
		});
	});
});
