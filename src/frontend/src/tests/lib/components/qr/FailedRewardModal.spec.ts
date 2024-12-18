import FailedRewardModal from '$lib/components/qr/FailedRewardModal.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('FailedRewardModal', () => {
	it('should render expected texts', () => {
		const { getByText } = render(FailedRewardModal);

		expect(getByText(get(i18n).vip.reward.text.title_failed)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.reward_failed)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.reward_failed_description)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
	});
});
