import Activity from '$lib/components/transactions/Activity.svelte';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

describe('Activity', () => {
	it('renders the title', () => {
		const { container } = render(Activity);

		const title: HTMLHeadingElement | null = container.querySelector('h1');

		expect(title).not.toBeNull();
		assertNonNullish(title, 'Title not found');
		expect(title).toBeInTheDocument();
		expect(title.textContent).toBe(en.activity.text.title);
	});
});
