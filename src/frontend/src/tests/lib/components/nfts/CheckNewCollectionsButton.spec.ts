import CheckNewCollectionsButton from '$lib/components/nfts/CheckNewCollectionsButton.svelte';
import { NFT_HERO_CHECK_NEW_BUTTON } from '$lib/constants/test-ids.constants';
import { isBusy } from '$lib/derived/busy.derived';
import { busy } from '$lib/stores/busy.store';
import { HERO_CONTEXT_KEY, initHeroContext, type HeroContext } from '$lib/stores/hero.store';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('CheckNewCollectionsButton', () => {
	let mockContextStore: HeroContext;
	let spyEmit: MockInstance;

	const mockContext = (store: HeroContext) => new Map([[HERO_CONTEXT_KEY, store]]);

	const mockEmit = vi
		.fn()
		.mockImplementation(({ detail }: { message: string; detail?: { callback?: () => void } }) => {
			// call the callback after
			detail?.callback?.();
		});

	const renderButton = () =>
		render(CheckNewCollectionsButton, { context: mockContext(mockContextStore) });

	beforeEach(() => {
		vi.clearAllMocks();

		busy.stop();

		mockContextStore = initHeroContext();

		spyEmit = vi.spyOn(eventsUtils, 'emit').mockImplementation(mockEmit);
	});

	it('should render the hero button', () => {
		const { getByTestId } = renderButton();

		const button = getByTestId(NFT_HERO_CHECK_NEW_BUTTON) as HTMLButtonElement;

		expect(button).toBeInTheDocument();
		expect(button.tagName).toBe('BUTTON');
		expect(button).toBeEnabled();
	});

	it('should render the icon', () => {
		const { container } = renderButton();

		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('should use the long label as the accessible name', () => {
		const { getByRole } = renderButton();

		expect(getByRole('button', { name: en.nfts.alt.check_new })).toBeInTheDocument();
	});

	it('should render both the long and the short label', () => {
		const { getByText } = renderButton();

		expect(getByText(en.nfts.text.check_new)).toBeInTheDocument();
		expect(getByText(en.nfts.text.check_new_short)).toBeInTheDocument();
	});

	it('should emit event `oisyReloadCollections` on click', () => {
		const { getByTestId } = renderButton();

		const button = getByTestId(NFT_HERO_CHECK_NEW_BUTTON) as HTMLButtonElement;

		button.click();

		expect(emit).toHaveBeenCalledExactlyOnceWith({
			message: 'oisyReloadCollections',
			detail: { callback: expect.any(Function) }
		});
	});

	it('should be loading before the event is emitted and finished afterwards', async () => {
		spyEmit.mockImplementation(vi.fn());

		const { getByTestId } = renderButton();

		const button = getByTestId(NFT_HERO_CHECK_NEW_BUTTON) as HTMLButtonElement;

		expect(button).toBeEnabled();

		button.click();

		await waitFor(() => {
			expect(button).toBeDisabled();
		});

		const emittedDetail = spyEmit.mock.calls[0][0].detail;
		if ('callback' in emittedDetail) {
			emittedDetail.callback();
		}

		await waitFor(() => {
			expect(button).toBeEnabled();
		});
	});

	it('should be disabled if busy', async () => {
		const { getByTestId } = renderButton();

		busy.start();

		expect(get(isBusy)).toBeTruthy();

		const button = getByTestId(NFT_HERO_CHECK_NEW_BUTTON) as HTMLButtonElement;

		await waitFor(() => {
			expect(button).toBeDisabled();
		});

		button.click();

		expect(emit).not.toHaveBeenCalled();
	});
});
