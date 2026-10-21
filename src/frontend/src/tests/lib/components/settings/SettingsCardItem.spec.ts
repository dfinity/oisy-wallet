import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('SettingsCardItem', () => {
	const snippet = (text: string) =>
		createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

	// Several rows sit on one settings page; "Info" alone would read the same for each.
	it('names its info toggle after the row', () => {
		const { getByRole } = render(SettingsCardItem, {
			props: { key: snippet('Principal'), info: snippet('Your identifier') }
		});

		expect(getByRole('button', { name: `${en.core.text.info} Principal` })).toBeInTheDocument();
	});

	it('says whether the info is open', async () => {
		const { getByRole } = render(SettingsCardItem, {
			props: { key: snippet('Principal'), info: snippet('Your identifier') }
		});

		const toggle = getByRole('button', { name: `${en.core.text.info} Principal` });

		expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
	});

	it('gives two rows different toggle names', () => {
		const { getByRole } = render(SettingsCardItem, {
			props: { key: snippet('Principal'), info: snippet('a') }
		});
		render(SettingsCardItem, { props: { key: snippet('Active networks'), info: snippet('b') } });

		expect(getByRole('button', { name: `${en.core.text.info} Principal` })).toBeInTheDocument();
		expect(
			getByRole('button', { name: `${en.core.text.info} Active networks` })
		).toBeInTheDocument();
	});
});
