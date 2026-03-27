import * as onramperEnv from '$env/rest/onramper.env';
import BuyButton from '$lib/components/buy/BuyButton.svelte';
import { BUY_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
import { isBusy } from '$lib/derived/busy.derived';
import { busy } from '$lib/stores/busy.store';
import { HERO_CONTEXT_KEY, initHeroContext, type HeroContext } from '$lib/stores/hero.store';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('BuyButton', () => {
	let mockContextStore: HeroContext;

	const mockContext = (store: HeroContext) => new Map([[HERO_CONTEXT_KEY, store]]);

	const mockOnClick = vi.fn();

	const props = { onclick: mockOnClick };

	beforeEach(() => {
		vi.clearAllMocks();

		busy.stop();

		mockContextStore = initHeroContext();

		mockContextStore.inflowActionsDisabled.set(false);

		vi.spyOn(onramperEnv, 'ONRAMPER_API_KEY', 'get').mockImplementation(
			() => 'mock-onramper-api-key'
		);
	});

	it('should render the Hero button', () => {
		const { getByTestId } = render(BuyButton, {
			props,
			context: mockContext(mockContextStore)
		});

		expect(getByTestId(BUY_TOKENS_MODAL_OPEN_BUTTON)).toBeInTheDocument();
	});

	it('should be enabled if not busy and inflow actions enabled', async () => {
		const { getByTestId } = render(BuyButton, {
			props,
			context: mockContext(mockContextStore)
		});

		const btn = getByTestId(BUY_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeEnabled();
		});

		btn.click();

		expect(mockOnClick).toHaveBeenCalledOnce();
	});

	it('should be disabled if busy', async () => {
		const { getByTestId } = render(BuyButton, {
			props,
			context: mockContext(mockContextStore)
		});

		busy.start();

		expect(get(isBusy)).toBeTruthy();

		const btn = getByTestId(BUY_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeDisabled();
		});

		btn.click();

		expect(mockOnClick).not.toHaveBeenCalled();
	});

	it('should be disabled if inflow actions disabled', async () => {
		mockContextStore.inflowActionsDisabled.set(true);

		const { getByTestId } = render(BuyButton, {
			props,
			context: mockContext(mockContextStore)
		});

		const btn = getByTestId(BUY_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeDisabled();
		});

		btn.click();

		expect(mockOnClick).not.toHaveBeenCalled();
	});

	it('should be disabled if onramper API key is empty', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_API_KEY', 'get').mockImplementationOnce(() => '');

		const { getByTestId } = render(BuyButton, {
			props,
			context: mockContext(mockContextStore)
		});

		const btn = getByTestId(BUY_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeDisabled();
		});

		btn.click();

		expect(mockOnClick).not.toHaveBeenCalled();
	});

	it('should be disabled if onramper API key is nullish', async () => {
		vi.spyOn(onramperEnv, 'ONRAMPER_API_KEY', 'get').mockImplementationOnce(() => undefined);

		const { getByTestId } = render(BuyButton, {
			props,
			context: mockContext(mockContextStore)
		});

		const btn = getByTestId(BUY_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeDisabled();
		});

		btn.click();

		expect(mockOnClick).not.toHaveBeenCalled();
	});
});
