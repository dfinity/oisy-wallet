import Banner from '$lib/components/core/Banner.svelte';
import type * as appConstants from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/constants/app.constants', async (importOriginal) => ({
	...(await importOriginal<typeof appConstants>()),
	STAGING: true
}));

describe('Banner', () => {
	it('keeps the staging warning in the page flow when requested', async () => {
		const { core } = get(i18n);
		const { getByRole, queryByRole } = render(Banner, { inFlow: true });
		const warning = getByRole('heading', { name: core.info.test_banner });

		expect(warning.closest('.test-banner')).not.toHaveClass('overlay');

		await fireEvent.click(getByRole('button', { name: core.text.close }));

		expect(queryByRole('heading', { name: core.info.test_banner })).not.toBeInTheDocument();
	});

	it('overlays the page by default', () => {
		const { getByRole } = render(Banner);
		const warning = getByRole('heading', { name: get(i18n).core.info.test_banner });

		expect(warning.closest('.test-banner')).toHaveClass('overlay');
	});
});
