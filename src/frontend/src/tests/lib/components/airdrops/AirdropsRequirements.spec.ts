import type { AirdropDescription } from '$env/types/env-airdrop';
import AirdropsRequirements from '$lib/components/airdrops/AirdropsRequirements.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { mockAirdropCampaigns } from '$tests/mocks/airdrop-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import {AIRDROPS_REQUIREMENTS_STATUS, AIRDROPS_REQUIREMENTS_STATUS_SPINNER} from "$lib/constants/test-ids.constants";

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
		const requirementStatusSpinnerSelector = (index: number) =>
			`span[data-tid="${AIRDROPS_REQUIREMENTS_STATUS_SPINNER}-${index}"]`;

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

		it('should render spinners if wrong amount of requirement states are available', () => {
			const { container } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: false,
					requirementsFulfilled: [false, false]
				}
			});

			mockAirdropCampaign.requirements.forEach((requirement, index) => {
				const requirementStatusSpinner: HTMLSpanElement | null = container.querySelector(
					requirementStatusSpinnerSelector(index)
				);
				expect(requirementStatusSpinner).toBeInTheDocument();
			});
		});

		it('should render spinners if no requirement states are available', () => {
			const { container } = render(AirdropsRequirements, {
				props: {
					loading: false,
					airdrop: mockAirdropCampaign,
					isEligible: false,
					requirementsFulfilled: []
				}
			});

			mockAirdropCampaign.requirements.forEach((requirement, index) => {
				const requirementStatusSpinner: HTMLSpanElement | null = container.querySelector(
					requirementStatusSpinnerSelector(index)
				);
				expect(requirementStatusSpinner).toBeInTheDocument();
			});
		});
	});
});
