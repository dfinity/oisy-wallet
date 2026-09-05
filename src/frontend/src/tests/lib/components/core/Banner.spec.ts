import Banner from '$lib/components/core/Banner.svelte';
import en from '$lib/i18n/en.json';
import { fireEvent, render } from '@testing-library/svelte';

describe('Banner', () => {
	// Testing harness - DO NOT MERGE. The harness banner is deliberately unconditional: no env is
	// mocked here, and that is the point - it must render in every build, including production.
	it('should show the harness banner whatever the environment', () => {
		const { getByText } = render(Banner);

		expect(getByText(/Testing harness build/i)).toBeInTheDocument();
		expect(getByText(/Never deploy to production/i)).toBeInTheDocument();
	});

	it('should take the slot of the environment banner', () => {
		const { queryByText } = render(Banner);

		expect(queryByText(en.core.info.test_banner)).toBeNull();
		expect(queryByText(en.core.info.test_banner_beta)).toBeNull();
	});

	it('should hide the banner after clicking the close button', async () => {
		const { getByLabelText, queryByText } = render(Banner);

		await fireEvent.click(getByLabelText(en.core.text.close));

		expect(queryByText(/Testing harness build/i)).toBeNull();
	});
});
