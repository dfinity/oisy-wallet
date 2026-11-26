import LandingWalletPreview from '$lib/components/auth/LandingWalletPreview.svelte';
import { Languages } from '$lib/enums/languages';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('LandingWalletPreview', () => {
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

	it('shows the exact final balance immediately when motion is disabled', () => {
		const { container } = render(LandingWalletPreview);

		expect(
			container.querySelector('.portfolio-balance text[visibility="visible"]')
		).toHaveTextContent('$28,406.15');
	});

	describe('animated balance', () => {
		let runFrame: FrameRequestCallback = () => {};

		beforeEach(() => {
			const query = window.matchMedia('(prefers-reduced-motion: no-preference)');
			vi.mocked(window.matchMedia).mockReturnValueOnce({ ...query, matches: true });
			vi.spyOn(performance, 'now').mockReturnValue(1_000);
			vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
				runFrame = callback;
				return 1;
			});
		});

		afterEach(() => {
			Reflect.deleteProperty(document, 'fonts');
			vi.restoreAllMocks();
		});

		it('counts up at a fixed right edge and settles on the exact amount', async () => {
			const resolveFonts = mockPendingFonts();
			const { container, getByText, unmount } = render(LandingWalletPreview);
			const finalAmount = container.querySelector('.portfolio-balance text');

			Object.defineProperty(finalAmount, 'getComputedTextLength', { value: () => 160 });
			await resolveFonts();
			await tick();

			expect(finalAmount).toHaveAttribute('visibility', 'visible');
			expect(finalAmount).toHaveTextContent('$28,406.15');

			runFrame(1_140);
			await tick();

			const counter = getByText('$0.00');

			expect(finalAmount).toHaveAttribute('visibility', 'hidden');
			expect(counter).toHaveAttribute('x', '638');
			expect(counter).toHaveAttribute('text-anchor', 'end');

			runFrame(1_300);
			await tick();

			expect(counter).toHaveTextContent('$12,263.00');

			runFrame(1_600);
			await tick();

			expect(counter).toHaveTextContent('$25,979.00');
			expect(counter).toHaveAttribute('x', '638');

			runFrame(1_790);
			await tick();

			expect(counter).not.toBeInTheDocument();
			expect(finalAmount).toHaveAttribute('visibility', 'visible');
			expect(finalAmount).toHaveTextContent('$28,406.15');

			unmount();
		});

		it('keeps the total visible when fonts arrive after the animation deadline', async () => {
			const resolveFonts = mockPendingFonts();
			const { container, unmount } = render(LandingWalletPreview);
			const finalAmount = container.querySelector('.portfolio-balance text');
			Object.defineProperty(finalAmount, 'getComputedTextLength', { value: () => 160 });
			vi.mocked(performance.now).mockReturnValue(2_000);
			await tick();

			expect(finalAmount).toHaveAttribute('visibility', 'visible');
			expect(finalAmount).toHaveTextContent('$28,406.15');
			expect(window.requestAnimationFrame).not.toHaveBeenCalled();

			await resolveFonts();
			runFrame(2_000);
			await tick();

			expect(finalAmount).toHaveAttribute('visibility', 'visible');
			expect(container.querySelector('.portfolio-balance text[text-anchor="end"]')).toBeNull();
			expect(window.requestAnimationFrame).toHaveBeenCalledOnce();

			unmount();
		});
	});

	describe('localized labels', () => {
		const measureText = vi.fn(function (this: SVGTextElement) {
			return this.textContent === get(i18n).networks.chain_fusion ? 110 : 20;
		});

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
