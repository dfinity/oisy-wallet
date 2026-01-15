import ExpandText from '$lib/components/ui/ExpandText.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ExpandText', () => {
	const longText = 'one two three four five six seven eight nine ten';
	const shortText = 'one two three';

	it('renders truncated text initially', () => {
		const { getByText, queryByText } = render(ExpandText, {
			props: { text: longText, maxWords: 3 }
		});

		// truncated version should be shown
		expect(getByText('one two three…')).toBeInTheDocument();

		// full text should not yet be in DOM
		expect(queryByText(longText)).toBeNull();
	});

	it('expands to full text when "more" is clicked', async () => {
		const { getByText } = render(ExpandText, {
			props: { text: longText, maxWords: 3 }
		});

		const moreBtn = getByText(get(i18n).core.text.more);
		await fireEvent.click(moreBtn);

		// full text appears
		expect(getByText(longText)).toBeInTheDocument();
		// button label switches to "less"
		expect(getByText(get(i18n).core.text.less)).toBeInTheDocument();
	});

	it('collapses back to truncated when "less" is clicked', async () => {
		const { getByText } = render(ExpandText, {
			props: { text: longText, maxWords: 3 }
		});

		const moreBtn = getByText(get(i18n).core.text.more);
		await fireEvent.click(moreBtn);

		const lessBtn = getByText(get(i18n).core.text.less);
		await fireEvent.click(lessBtn);

		// truncated text shown again
		expect(getByText('one two three…')).toBeInTheDocument();
	});

	it('respects maxWords prop', () => {
		const { getByText } = render(ExpandText, {
			props: { text: longText, maxWords: 5 }
		});

		expect(getByText('one two three four five…')).toBeInTheDocument();
	});

	it('shows "more" button if text is longer than maxWords', () => {
		const { getByText } = render(ExpandText, {
			props: { text: longText, maxWords: 3 }
		});

		expect(getByText(get(i18n).core.text.more)).toBeInTheDocument();
	});

	it('does not render the "more" button if text is shorter than maxWords', () => {
		const { queryByText } = render(ExpandText, {
			props: { text: shortText, maxWords: 10 }
		});

		// should just show the full text, no truncation
		expect(queryByText(shortText)).toBeInTheDocument();

		// no "more" button in DOM
		expect(queryByText(get(i18n).core.text.more)).toBeNull();
	});
});
