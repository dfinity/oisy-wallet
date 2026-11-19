import NftGroupToggle from '$lib/components/nfts/NftGroupToggle.svelte';
import {
	NFT_GROUP_TOGGLE_COLLECTIONS,
	NFT_GROUP_TOGGLE_UNGROUPED
} from '$lib/constants/test-ids.constants';
import * as settingsDerived from '$lib/derived/settings.derived';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { nftGroupByCollectionStore } from '$lib/stores/settings.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('NftGroupToggle', () => {
	const trackEventSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});
	const nftGroupByCollectionStoreSpy = vi.spyOn(nftGroupByCollectionStore, 'set');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render both grouping options', () => {
		vi.spyOn(settingsDerived, 'nftGroupByCollection', 'get').mockReturnValue(writable(false));

		const { getByText } = render(NftGroupToggle);

		expect(getByText(get(i18n).nfts.text.ungrouped)).toBeInTheDocument();
		expect(getByText(get(i18n).nfts.text.collections)).toBeInTheDocument();
	});

	it('should mark ungrouped as selected when not grouped by collection', () => {
		vi.spyOn(settingsDerived, 'nftGroupByCollection', 'get').mockReturnValue(writable(false));

		const { container } = render(NftGroupToggle);

		const ungrouped = container.querySelector(`[data-tid="${NFT_GROUP_TOGGLE_UNGROUPED}"]`);
		const collections = container.querySelector(`[data-tid="${NFT_GROUP_TOGGLE_COLLECTIONS}"]`);

		expect(ungrouped).toHaveClass('bg-primary');
		expect(collections).not.toHaveClass('bg-primary');
	});

	it('should mark collections as selected when grouped by collection', () => {
		vi.spyOn(settingsDerived, 'nftGroupByCollection', 'get').mockReturnValue(writable(true));

		const { container } = render(NftGroupToggle);

		const ungrouped = container.querySelector(`[data-tid="${NFT_GROUP_TOGGLE_UNGROUPED}"]`);
		const collections = container.querySelector(`[data-tid="${NFT_GROUP_TOGGLE_COLLECTIONS}"]`);

		expect(collections).toHaveClass('bg-primary');
		expect(ungrouped).not.toHaveClass('bg-primary');
	});

	it('should set grouping to collections when clicked', async () => {
		vi.spyOn(settingsDerived, 'nftGroupByCollection', 'get').mockReturnValue(writable(false));

		const { getByText } = render(NftGroupToggle);

		await fireEvent.click(getByText(get(i18n).nfts.text.collections));

		expect(nftGroupByCollectionStoreSpy).toHaveBeenCalledWith({
			key: 'nft-group-by-collection',
			value: true
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.GROUP,
				event_value: 'collection'
			}
		});
	});

	it('should set grouping to ungrouped when clicked', async () => {
		vi.spyOn(settingsDerived, 'nftGroupByCollection', 'get').mockReturnValue(writable(true));

		const { getByText } = render(NftGroupToggle);

		await fireEvent.click(getByText(get(i18n).nfts.text.ungrouped));

		expect(nftGroupByCollectionStoreSpy).toHaveBeenCalledWith({
			key: 'nft-group-by-collection',
			value: false
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.GROUP,
				event_value: 'plain_list'
			}
		});
	});

	it('should not emit an event when clicking the already-selected option', async () => {
		vi.spyOn(settingsDerived, 'nftGroupByCollection', 'get').mockReturnValue(writable(false));

		const { getByText } = render(NftGroupToggle);

		await fireEvent.click(getByText(get(i18n).nfts.text.ungrouped));

		expect(nftGroupByCollectionStoreSpy).not.toHaveBeenCalled();
		expect(trackEventSpy).not.toHaveBeenCalled();
	});
});
