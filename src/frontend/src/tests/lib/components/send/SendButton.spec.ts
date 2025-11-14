import SendButton from '$lib/components/send/SendButton.svelte';
import { SEND_TOKENS_MODAL_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
import { isBusy } from '$lib/derived/busy.derived';
import { busy } from '$lib/stores/busy.store';
import { HERO_CONTEXT_KEY, initHeroContext, type HeroContext } from '$lib/stores/hero.store';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SendButton', () => {
	let mockContextStore: HeroContext;

	const mockContext = (store: HeroContext) => new Map([[HERO_CONTEXT_KEY, store]]);

	const mockOnClick = vi.fn();

	const props = { onclick: mockOnClick };

	beforeEach(() => {
		vi.clearAllMocks();

		busy.stop();

		mockContextStore = initHeroContext();

		mockContextStore.outflowActionsDisabled.set(false);
	});

	it('should render the Hero button', () => {
		const { getByTestId } = render(SendButton, {
			props,
			context: mockContext(mockContextStore)
		});

		expect(getByTestId(SEND_TOKENS_MODAL_OPEN_BUTTON)).toBeInTheDocument();
	});

	it('should be enabled if not busy and outflow actions enabled', async () => {
		const { getByTestId } = render(SendButton, {
			props,
			context: mockContext(mockContextStore)
		});

		const btn = getByTestId(SEND_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeEnabled();
		});

		btn.click();

		expect(mockOnClick).toHaveBeenCalledOnce();
	});

	it('should be disabled if busy', async () => {
		const { getByTestId } = render(SendButton, {
			props,
			context: mockContext(mockContextStore)
		});

		busy.start();

		expect(get(isBusy)).toBeTruthy();

		const btn = getByTestId(SEND_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeDisabled();
		});

		btn.click();

		expect(mockOnClick).not.toHaveBeenCalled();
	});

	it('should be disabled if outflow actions disabled', async () => {
		mockContextStore.outflowActionsDisabled.set(true);

		const { getByTestId } = render(SendButton, {
			props,
			context: mockContext(mockContextStore)
		});

		const btn = getByTestId(SEND_TOKENS_MODAL_OPEN_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(btn).toBeDisabled();
		});

		btn.click();

		expect(mockOnClick).not.toHaveBeenCalled();
	});
});
