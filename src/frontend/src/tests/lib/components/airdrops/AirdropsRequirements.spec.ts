import type { AirdropDescription } from '$env/types/env-airdrop';
import AirdropsRequirements from '$lib/components/airdrops/AirdropsRequirements.svelte';
import { AIRDROPS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { mockAirdropCampaigns } from '$tests/mocks/airdrop-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AirdropsRequirements', () => {
	const mockAirdropCampaign: AirdropDescription | undefined = mockAirdropCampaigns.find(
		({ id }) => id === 'OISY Airdrop #1'
	);
	assertNonNullish(mockAirdropCampaign);

	describe('IsEligible', () => {
		it('should not render badge if not eligible', () => {
			const { queryByText } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: false,
					requirementsFulfilled: [true, true, true]
				}
			});

			expect(queryByText(get(i18n).airdrops.text.youre_eligible)).not.toBeInTheDocument();
		});

		it('should render badge if eligible', () => {
			const { queryByText } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: true,
					requirementsFulfilled: [true, true, true]
				}
			});

			expect(queryByText(get(i18n).airdrops.text.youre_eligible)).toBeInTheDocument();
		});
	});

	describe('RequirementsFulfilled', () => {
		const requirementStatusSelector = (index: number) =>
			`span[data-tid="${AIRDROPS_REQUIREMENTS_STATUS}-${index}"]`;

		it('should render all requirements as fulfilled', () => {
			const { container } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: false,
					requirementsFulfilled: [true, true, true]
				}
			});

			mockAirdropCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-success-primary');
			});
		});

		it('should render all requirements as not fulfilled', () => {
			const { container } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: false,
					requirementsFulfilled: [false, false, false]
				}
			});

			mockAirdropCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-disabled');
			});
		});

		it('should render all requirements as not fulfilled if incorrect amount of states are provided', () => {
			const { container } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: false,
					requirementsFulfilled: [false, false]
				}
			});

			mockAirdropCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-disabled');
			});
		});

		it('should render all requirements as not fulfilled if no states are provided', () => {
			const { container } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: false,
					requirementsFulfilled: []
				}
			});

			mockAirdropCampaign.requirements.forEach((requirement, index) => {
				const requirementStatus: HTMLSpanElement | null = container.querySelector(
					requirementStatusSelector(index)
				);
				expect(requirementStatus).toBeInTheDocument();
				expect(requirementStatus?.className).toContain('text-disabled');
			});
		});
	});
});
