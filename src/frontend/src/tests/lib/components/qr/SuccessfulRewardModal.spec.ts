import SuccessfulRewardModal from '$lib/components/qr/SuccessfulRewardModal.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SuccessfulRewardModal', () => {
	it('should render expected texts', () => {
		const { getByText } = render(SuccessfulRewardModal);

		expect(getByText(get(i18n).vip.reward.text.title_successful)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.reward_received)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.reward_received_description)).toBeInTheDocument();
		expect(getByText(get(i18n).vip.reward.text.open_wallet)).toBeInTheDocument();
	});
});
