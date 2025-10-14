import NftsSettingsMenu from '$lib/components/nfts/NftSettingsMenu.svelte';
import { TRACK_NFT_SETTINGS_CHANGE } from '$lib/constants/analytics.constants';
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
			name: TRACK_NFT_SETTINGS_CHANGE,
			metadata: { grouping: 'plain_list' }
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
			name: TRACK_NFT_SETTINGS_CHANGE,
			metadata: { grouping: 'collection' }
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
			name: TRACK_NFT_SETTINGS_CHANGE,
			metadata: expect.objectContaining({
				show_hidden: expect.stringMatching(/enabled|disabled/)
			})
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
			name: TRACK_NFT_SETTINGS_CHANGE,
			metadata: expect.objectContaining({
				show_spam: expect.stringMatching(/enabled|disabled/)
			})
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
