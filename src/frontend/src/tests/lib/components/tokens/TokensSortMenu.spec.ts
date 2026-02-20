import TokensSortMenu from '$lib/components/tokens/TokensSortMenu.svelte';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { tokensSortStore } from '$lib/stores/settings.store';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TokensSortMenu', () => {
	const trackEventSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});
	const tokensSortStoreSpy = vi.spyOn(tokensSortStore, 'set');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the sorting button', () => {
		const { container } = render(TokensSortMenu);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('aria-label', get(i18n).navigation.alt.menu);
	});

	it('should open the popover when button is clicked', async () => {
		const { container, getByText } = render(TokensSortMenu);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();

		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const sortingTitle = getByText(get(i18n).core.text.sorting);

			expect(sortingTitle).toBeInTheDocument();
		});
	});

	it('should display all sorting options', async () => {
		const { container, getByText } = render(TokensSortMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(get(i18n).tokens.text.sort_by_value)).toBeInTheDocument();
			expect(getByText(get(i18n).tokens.text.sort_by_performance)).toBeInTheDocument();
			expect(getByText(get(i18n).tokens.text.sort_by_performance)).toBeInTheDocument();
		});
	});

	it('should set sorting to value when clicked', async () => {
		const { container, getByText } = render(TokensSortMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const option = getByText(get(i18n).tokens.text.sort_by_value);

			expect(option).toBeInTheDocument();
		});

		const option = getByText(get(i18n).tokens.text.sort_by_value);

		await fireEvent.click(option);

		expect(tokensSortStoreSpy).toHaveBeenCalledWith({
			key: 'tokens-sort',
			value: { type: 'value' }
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT,
				event_value: 'value'
			}
		});
	});

	it('should set sorting to performance when clicked', async () => {
		const { container, getByText } = render(TokensSortMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const option = getByText(get(i18n).tokens.text.sort_by_performance);

			expect(option).toBeInTheDocument();
		});

		const option = getByText(get(i18n).tokens.text.sort_by_performance);

		await fireEvent.click(option);

		expect(tokensSortStoreSpy).toHaveBeenCalledWith({
			key: 'tokens-sort',
			value: { type: 'performance' }
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT,
				event_value: 'performance'
			}
		});
	});

	it('should set sorting to symbol when clicked', async () => {
		const { container, getByText } = render(TokensSortMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			const option = getByText(get(i18n).tokens.text.sort_by_symbol);

			expect(option).toBeInTheDocument();
		});

		const option = getByText(get(i18n).tokens.text.sort_by_symbol);

		await fireEvent.click(option);

		expect(tokensSortStoreSpy).toHaveBeenCalledWith({
			key: 'tokens-sort',
			value: { type: 'symbol' }
		});

		expect(trackEventSpy).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.LIST_SETTINGS_CHANGE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.SORT,
				event_value: 'symbol'
			}
		});
	});

	it('should apply active class to button when popover is visible', async () => {
		const { container } = render(TokensSortMenu);

		const button = container.querySelector('button');

		expect(button).not.toHaveClass('active');

		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(button).toHaveClass('active');
		});
	});
});
