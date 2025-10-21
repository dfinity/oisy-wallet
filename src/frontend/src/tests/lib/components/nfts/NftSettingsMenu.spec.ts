import NftsSettingsMenu from '$lib/components/nfts/NftSettingsMenu.svelte';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import {
	nftGroupByCollectionStore,
	showHiddenStore,
	showSpamStore
} from '$lib/stores/settings.store';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftsSettingsMenu', () => {
	const trackEventSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});
	const nftGroupByCollectionStoreSpy = vi.spyOn(nftGroupByCollectionStore, 'set');
	const showHiddenStoreSpy = vi.spyOn(showHiddenStore, 'set');
	const showSpamStoreSpy = vi.spyOn(showSpamStore, 'set');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the settings button', () => {
		const { container } = render(NftsSettingsMenu);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('aria-label', get(i18n).navigation.alt.menu);
	});

	it('should open the popover when button is clicked', async () => {
		const { container, getByText } = render(NftsSettingsMenu);

		const button = container.querySelector('button');

		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const groupingTitle = getByText(get(i18n).nfts.text.grouping);

			expect(groupingTitle).toBeInTheDocument();
		});
	});

	it('should display all grouping options', async () => {
		const { container, getByText } = render(NftsSettingsMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(get(i18n).nfts.text.as_plain_list)).toBeInTheDocument();
			expect(getByText(get(i18n).nfts.text.by_collection)).toBeInTheDocument();
		});
	});

	it('should display list settings section', async () => {
		const { container, getByText } = render(NftsSettingsMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(get(i18n).tokens.manage.text.list_settings)).toBeInTheDocument();
			expect(getByText(get(i18n).nfts.text.show_hidden)).toBeInTheDocument();
			expect(getByText(get(i18n).nfts.text.show_spam)).toBeInTheDocument();
		});
	});

	it('should set grouping to plain list when clicked', async () => {
		const { container, getByText } = render(NftsSettingsMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const plainListOption = getByText(get(i18n).nfts.text.as_plain_list);

			expect(plainListOption).toBeInTheDocument();
		});

		const plainListOption = getByText(get(i18n).nfts.text.as_plain_list);

		await fireEvent.click(plainListOption);

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

	it('should set grouping to by collection when clicked', async () => {
		const { container, getByText } = render(NftsSettingsMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const byCollectionOption = getByText(get(i18n).nfts.text.by_collection);

			expect(byCollectionOption).toBeInTheDocument();
		});

		const byCollectionOption = getByText(get(i18n).nfts.text.by_collection);

		await fireEvent.click(byCollectionOption);

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

	it('should toggle show hidden when clicked', async () => {
		const { container, getByText } = render(NftsSettingsMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const showHiddenOption = getByText(get(i18n).nfts.text.show_hidden);

			expect(showHiddenOption).toBeInTheDocument();
		});

		const showHiddenOption = getByText(get(i18n).nfts.text.show_hidden);

		await fireEvent.click(showHiddenOption);

		expect(showHiddenStoreSpy).toHaveBeenCalled();

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'hidden',
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.VISIBILITY,
				event_value: 'show'
			}
		});
	});

	it('should toggle show spam when clicked', async () => {
		const { container, getByText } = render(NftsSettingsMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const showSpamOption = getByText(get(i18n).nfts.text.show_spam);

			expect(showSpamOption).toBeInTheDocument();
		});

		const showSpamOption = getByText(get(i18n).nfts.text.show_spam);

		await fireEvent.click(showSpamOption);

		expect(showSpamStoreSpy).toHaveBeenCalled();

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'spam',
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.VISIBILITY,
				event_value: 'show'
			}
		});
	});

	it('should apply active class to button when popover is visible', async () => {
		const { container } = render(NftsSettingsMenu);

		const button = container.querySelector('button');

		expect(button).not.toHaveClass('active');

		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(button).toHaveClass('active');
		});
	});
});
