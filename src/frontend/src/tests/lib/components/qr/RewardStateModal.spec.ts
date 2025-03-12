import RewardStateModal from '$lib/components/qr/VipRewardStateModal.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardStateModal', () => {
	it('should render expected texts in the positive case', () => {
		const { getByText } = render(RewardStateModal, { isSuccessful: true });

		expect(getByText(get(i18n).vip.reward.text.title_successful)).toBeInTheDocument();
		expect(
			getByText(replaceOisyPlaceholders(get(i18n).vip.reward.text.reward_received))
		).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.reward_received_description)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
	});

	it('should render expected texts in the negative case', () => {
		const { getByText } = render(RewardStateModal, { isSuccessful: false });

		expect(getByText(get(i18n).vip.reward.text.title_failed)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.reward_failed)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.reward_failed_description)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
	});
});
