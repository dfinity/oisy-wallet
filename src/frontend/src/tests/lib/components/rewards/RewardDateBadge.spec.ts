import { render } from '@testing-library/svelte';
import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { get } from 'svelte/store';

describe('RewardDateBadge', () => {
	const testId = 'testBadge'

	const dateBadgeSelector = `span[data-tid="${testId}"]`;

	it('should display upcoming date correctly', () => {
		const startDate = new Date();
		startDate.setDate(startDate.getDate() + 1);

		const endDate = new Date();
		endDate.setDate(endDate.getDate() + 2);

		const {container} = render(RewardDateBadge, {
			props: {
				startDate,
				endDate,
				testId
			}
		})

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		expect(dateBadge?.textContent).toContain(get(i18n).rewards.text.upcoming_date);
	});

	it('should display active date correctly', () => {
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 1);

		const endDate = new Date();
		endDate.setDate(endDate.getDate() + 1);

		const {container} = render(RewardDateBadge, {
			props: {
				startDate,
				endDate,
				testId
			}
		})

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		expect(dateBadge?.textContent).toContain(get(i18n).rewards.text.active_date);
	});

	it('should display ended date correctly', () => {
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 2);

		const endDate = new Date();
		endDate.setDate(endDate.getDate() - 1);

		const {container} = render(RewardDateBadge, {
			props: {
				startDate,
				endDate,
				testId
			}
		})

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		expect(dateBadge?.textContent).toContain(get(i18n).rewards.text.ended_date);
	});
});