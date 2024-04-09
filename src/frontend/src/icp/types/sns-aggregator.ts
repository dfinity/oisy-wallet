// Copy of NNS dapp sns-aggregator.ts with small adaptations

type CanisterIds = {
	root_canister_id: string;
	governance_canister_id: string;
	ledger_canister_id: string;
	swap_canister_id: string;
	index_canister_id: string;
};

type ListSnsCanisterIds = {
	root: string;
	governance: string;
	ledger: string;
	swap: string;
	dapps: string[];
	archives: string[];
	index: string;
};

export type CachedSnsMetadataDto = {
	url: string | null;
	name: string | null;
	description: string | null;
	logo: string | null;
};

interface GenericNervousSystemFunctionDto {
	validator_canister_id: string | null;
	target_canister_id: string | null;
	validator_method_name: string | null;
	target_method_name: string | null;
}

export type CachedFunctionTypeDto =
	| { NativeNervousSystemFunction: Record<never, never> }
	| { GenericNervousSystemFunction: GenericNervousSystemFunctionDto };

export type CachedNervousFunctionDto = {
	id: number;
	name: string;
	description: string | null;
	function_type: CachedFunctionTypeDto | null;
};

export interface CachedDefaultFollowees {
	followees: bigint[];
}

export interface CachedNeuronPermissions {
	permissions: number[];
}

export interface ChachedVotingRewardsParameters {
	final_reward_rate_basis_points: number;
	initial_reward_rate_basis_points: number;
	reward_rate_transition_duration_seconds: number;
	round_duration_seconds: number;
}

export interface CachedNervousSystemParameters {
	default_followees: CachedDefaultFollowees;
	max_dissolve_delay_seconds: number;
	max_dissolve_delay_bonus_percentage: number;
	max_followees_per_function: number;
	neuron_claimer_permissions: CachedNeuronPermissions;
	neuron_minimum_stake_e8s: number;
	max_neuron_age_for_age_bonus: number;
	initial_voting_period_seconds: number;
	neuron_minimum_dissolve_delay_to_vote_seconds: number;
	reject_cost_e8s: number;
	max_proposals_to_keep_per_action: number;
	wait_for_quiet_deadline_increase_seconds: number;
	max_number_of_neurons: number;
	transaction_fee_e8s: number;
	max_number_of_proposals_with_ballots: number;
	max_age_bonus_percentage: number;
	neuron_grantable_permissions: CachedNeuronPermissions;
	voting_rewards_parameters: ChachedVotingRewardsParameters;
	maturity_modulation_disabled: boolean | null;
	max_number_of_principals_per_neuron: number;
}

type CachedCountriesDto = {
	iso_codes: string[];
};

export type CachedSwapParamsDto = {
	min_participants: number;
	min_icp_e8s: number;
	max_icp_e8s: number;
	min_participant_icp_e8s: number;
	max_participant_icp_e8s: number;
	swap_due_timestamp_seconds: number;
	sns_token_e8s: number;
	neuron_basket_construction_parameters: {
		count: number;
		dissolve_delay_interval_seconds: number;
	};
	sale_delay_seconds?: number | null;
	min_direct_participation_icp_e8s?: number | null;
	max_direct_participation_icp_e8s?: number | null;
};

interface CachedLinearScalingCoefficient {
	slope_numerator?: number | null;
	slope_denominator?: number | null;
	intercept_icp_e8s?: number | null;
	from_direct_participation_icp_e8s?: number | null;
	to_direct_participation_icp_e8s?: number | null;
}

export type CachedNeuronsFundParticipationConstraints = {
	coefficient_intervals: Array<CachedLinearScalingCoefficient>;
	max_neurons_fund_participation_icp_e8s?: number | null;
	min_direct_participation_threshold_icp_e8s?: number | null;
};

// TODO: update when the candid is updated with the new init params
export type CachedSwapInitParamsDto = {
	// TODO: Recheck after next governance canister upgrade ~2023-08-14 (currently the aggregator returns null for next `null |` params)
	nns_proposal_id: null | number;
	max_icp_e8s: null | number;
	swap_start_timestamp_seconds: null | number;
	swap_due_timestamp_seconds: null | number;
	min_participants: null | number;
	sns_token_e8s: null | number;
	neurons_fund_participants: null | {
		// NeuronsFundParticipants
		cf_participants: Array<{
			// CfParticipant
			hotkey_principal: string;
			cf_neurons: Array<{
				// CfNeuron
				nns_neuron_id: number;
				amount_icp_e8s: number;
			}>;
		}>;
	};
	should_auto_finalize: null | boolean;
	max_participant_icp_e8s: null | number;
	min_icp_e8s: null | number;
	min_participant_icp_e8s: null | number;
	neuron_basket_construction_parameters: null | {
		dissolve_delay_interval_seconds: number;
		count: number;
	};
	//
	nns_governance_canister_id: string;
	sns_governance_canister_id: string;
	sns_ledger_canister_id: string;
	icp_ledger_canister_id: string;
	sns_root_canister_id: string;
	fallback_controller_principal_ids: string[];
	transaction_fee_e8s: number;
	neuron_minimum_stake_e8s: number;
	confirmation_text?: string | null;
	restricted_countries?: CachedCountriesDto | null;
	neurons_fund_participation_constraints?: CachedNeuronsFundParticipationConstraints | null;
	min_direct_participation_icp_e8s?: number | null;
	max_direct_participation_icp_e8s?: number | null;
	neurons_fund_participation?: boolean | null;
};

export type CachedSnsSwapDto = {
	lifecycle: number;
	decentralization_sale_open_timestamp_seconds?: number | null;
	finalize_swap_in_progress?: boolean;
	init: CachedSwapInitParamsDto | null;
	params: CachedSwapParamsDto | null;
	open_sns_token_swap_proposal_id: number | null;
	direct_participation_icp_e8s?: number | undefined | null;
	neurons_fund_participation_icp_e8s?: number | undefined | null;
};

export type CachedSnsSwapDerivedDto = {
	buyer_total_icp_e8s: number;
	sns_tokens_per_icp: number;
	cf_participant_count?: number | undefined | null;
	direct_participant_count?: number | undefined | null;
	cf_neuron_count?: number | undefined | null;
	direct_participation_icp_e8s?: number | undefined | null;
	neurons_fund_participation_icp_e8s?: number | undefined | null;
};

type CachedSwapParamsResponseDto = {
	params: CachedSwapParamsDto | null;
};

type CachedInitResponseDto = {
	init: CachedSwapInitParamsDto | null;
};

export type CachedLifecycleResponseDto = {
	decentralization_sale_open_timestamp_seconds: number | null;
	lifecycle: number | null;
};

export declare enum IcrcMetadataResponseEntries {
	SYMBOL = 'icrc1:symbol',
	NAME = 'icrc1:name',
	DECIMALS = 'icrc1:decimals',
	FEE = 'icrc1:fee',
	LOGO = 'icrc1:logo'
}

export type CachedSnsTokenMetadataDtoNat = { Nat: number[] };
export type CachedSnsTokenMetadataDtoText = { Text: string };

// Export for testing purposes
export type CachedSnsTokenMetadataDto = (
	| (string | CachedSnsTokenMetadataDtoNat)[]
	| (string | CachedSnsTokenMetadataDtoText)[]
)[];

// Export for testing purposes
export type CachedSnsDto = {
	index: number;
	canister_ids: CanisterIds;
	list_sns_canisters: ListSnsCanisterIds;
	meta: CachedSnsMetadataDto;
	parameters: {
		functions: CachedNervousFunctionDto[];
		reserved_ids: number[];
	};
	nervous_system_parameters: CachedNervousSystemParameters;
	// @deprecated
	swap_state: {
		swap: CachedSnsSwapDto;
		derived: CachedSnsSwapDerivedDto;
	};
	icrc1_metadata: CachedSnsTokenMetadataDto;
	icrc1_fee: number[];
	icrc1_total_supply: number;
	derived_state: CachedSnsSwapDerivedDto;
	swap_params: CachedSwapParamsResponseDto;
	init: CachedInitResponseDto;
	lifecycle: CachedLifecycleResponseDto;
};
