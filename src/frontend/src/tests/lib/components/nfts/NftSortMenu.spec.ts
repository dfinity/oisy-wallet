import NftSorting from '$lib/components/nfts/NftSortMenu.svelte';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { nftSortStore } from '$lib/stores/settings.store';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftSorting', () => {
	const trackEventSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});
	const nftSortStoreSpy = vi.spyOn(nftSortStore, 'set');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the sorting button', () => {
		const { container } = render(NftSorting);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('aria-label', get(i18n).navigation.alt.menu);
	});

	it('should open the popover when button is clicked', async () => {
		const { container, getByText } = render(NftSorting);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();

		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const sortingTitle = getByText(get(i18n).nfts.text.sorting);

			expect(sortingTitle).toBeInTheDocument();
		});
	});

	it('should display all sorting options', async () => {
		const { container, getByText } = render(NftSorting);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(get(i18n).nfts.text.recents_first)).toBeInTheDocument();
			expect(getByText(get(i18n).nfts.text.oldest_first)).toBeInTheDocument();
			expect(getByText(get(i18n).nfts.text.collection_atoz)).toBeInTheDocument();
			expect(getByText(get(i18n).nfts.text.collection_ztoa)).toBeInTheDocument();
		});
	});

	it('should set sorting to recents first (date asc) when clicked', async () => {
		const { container, getByText } = render(NftSorting);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const recentsFirstOption = getByText(get(i18n).nfts.text.recents_first);

			expect(recentsFirstOption).toBeInTheDocument();
		});

		const recentsFirstOption = getByText(get(i18n).nfts.text.recents_first);

		await fireEvent.click(recentsFirstOption);

		expect(nftSortStoreSpy).toHaveBeenCalledWith({
			key: 'nft-sort',
			value: { order: 'desc', type: 'date' }
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT_DESC,
				event_value: 'date'
			}
		});
	});

	it('should set sorting to oldest first (date desc) when clicked', async () => {
		const { container, getByText } = render(NftSorting);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const oldestFirstOption = getByText(get(i18n).nfts.text.oldest_first);

			expect(oldestFirstOption).toBeInTheDocument();
		});

		const oldestFirstOption = getByText(get(i18n).nfts.text.oldest_first);

		await fireEvent.click(oldestFirstOption);

		expect(nftSortStoreSpy).toHaveBeenCalledWith({
			key: 'nft-sort',
			value: { order: 'asc', type: 'date' }
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT_ASC,
				event_value: 'date'
			}
		});
	});

	it('should set sorting to collection A-Z (collection-name asc) when clicked', async () => {
		const { container, getByText } = render(NftSorting);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const collectionAtoZOption = getByText(get(i18n).nfts.text.collection_atoz);

			expect(collectionAtoZOption).toBeInTheDocument();
		});

		const collectionAtoZOption = getByText(get(i18n).nfts.text.collection_atoz);

		await fireEvent.click(collectionAtoZOption);

		expect(nftSortStoreSpy).toHaveBeenCalledWith({
			key: 'nft-sort',
			value: { order: 'asc', type: 'collection-name' }
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT_ASC,
				event_value: 'collection-name'
			}
		});
	});

	it('should set sorting to collection Z-A (collection-name desc) when clicked', async () => {
		const { container, getByText } = render(NftSorting);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const collectionZtoAOption = getByText(get(i18n).nfts.text.collection_ztoa);

			expect(collectionZtoAOption).toBeInTheDocument();
		});

		const collectionZtoAOption = getByText(get(i18n).nfts.text.collection_ztoa);

		await fireEvent.click(collectionZtoAOption);

		expect(nftSortStoreSpy).toHaveBeenCalledWith({
			key: 'nft-sort',
			value: { order: 'desc', type: 'collection-name' }
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT_DESC,
				event_value: 'collection-name'
			}
		});
	});

	it('should apply active class to button when popover is visible', async () => {
		const { container } = render(NftSorting);

		const button = container.querySelector('button');

		expect(button).not.toHaveClass('active');

		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(button).toHaveClass('active');
		});
	});
});
