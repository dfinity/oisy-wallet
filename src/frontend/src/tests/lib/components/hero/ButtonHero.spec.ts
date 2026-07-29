import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
import { HERO_CONTEXT_KEY, initHeroContext, type HeroContext } from '$lib/stores/hero.store';
import { render, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('ButtonHero', () => {
	let mockContextStore: HeroContext;

	const mockContext = (store: HeroContext) => new Map([[HERO_CONTEXT_KEY, store]]);

	const testId = 'button-hero';

	const mockOnClick = vi.fn();

	const icon = createRawSnippet(() => ({ render: () => '<svg></svg>' }));
	const label = createRawSnippet(() => ({ render: () => '<span>Action</span>' }));

	const renderButton = (props: { disabled?: boolean } = {}) =>
		render(ButtonHero, {
			props: { icon, label, onclick: mockOnClick, ariaLabel: 'Action', testId, ...props },
			context: mockContext(mockContextStore)
		});

	beforeEach(() => {
		vi.clearAllMocks();

		mockContextStore = initHeroContext();
		mockContextStore.loading.set(false);
	});

	it('should be enabled when idle', () => {
		const { getByTestId } = renderButton();

		expect(getByTestId(testId)).toBeEnabled();
	});

	it('should be disabled when the caller disables it', () => {
		const { getByTestId } = renderButton({ disabled: true });

		expect(getByTestId(testId)).toBeDisabled();
	});

	// Every call site computes `disabled` from its own booleans, so it always passes an
	// explicit `false` when its own conditions are clear. The skeleton state must still win.
	it('should be disabled while the hero is initialising, even when the caller passes disabled false', async () => {
		mockContextStore.loading.set(true);

		const { getByTestId } = renderButton({ disabled: false });

		const button = getByTestId(testId) as HTMLButtonElement;

		await waitFor(() => {
			expect(button).toBeDisabled();
		});

		button.click();

		expect(mockOnClick).not.toHaveBeenCalled();
	});

	it('should become enabled once the hero finished initialising', async () => {
		mockContextStore.loading.set(true);

		const { getByTestId } = renderButton({ disabled: false });

		const button = getByTestId(testId) as HTMLButtonElement;

		await waitFor(() => {
			expect(button).toBeDisabled();
		});

		mockContextStore.loading.set(false);

		await waitFor(() => {
			expect(button).toBeEnabled();
		});

		button.click();

		expect(mockOnClick).toHaveBeenCalledOnce();
	});
});
