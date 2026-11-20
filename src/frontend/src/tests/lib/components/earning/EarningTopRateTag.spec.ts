import { goto } from '$app/navigation';
import EarningTopRateTag from '$lib/components/earning/EarningTopRateTag.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('EarningTopRateTag', () => {
	const label = `${formatStakeApyNumber(6.47)}% ${en.earning.card_fields.apy}`;

	it('shows the APY', () => {
		const { getByRole } = render(EarningTopRateTag, { props: { apy: 6.47 } });

		expect(getByRole('button')).toHaveTextContent(label);
	});

	it('says that it opens Earn', () => {
		const { getByRole } = render(EarningTopRateTag, { props: { apy: 6.47 } });

		expect(getByRole('button')).toHaveAccessibleName(
			replacePlaceholders(en.earning.text.top_rate_tag, { $apy: label })
		);
	});

	it('opens the Earn page', async () => {
		const { getByRole } = render(EarningTopRateTag, { props: { apy: 6.47 } });

		await fireEvent.click(getByRole('button'));

		expect(goto).toHaveBeenCalledExactlyOnceWith(AppPath.Earn);
	});
});
