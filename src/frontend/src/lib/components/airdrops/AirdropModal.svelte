<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropBanner from '$lib/components/airdrops/AirdropBanner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import AirdropsRequirements from '$lib/components/airdrops/AirdropsRequirements.svelte';
	import { getUserInfo } from '$lib/api/reward.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { onMount } from 'svelte';
	import type { RewardInfo } from '$declarations/rewards/rewards.did';
	import {
		LOCAL_CKUSDC_LEDGER_CANISTER_ID,
		CKBTC_LEDGER_CANISTER_IDS,
		STAGING_CKBTC_LEDGER_CANISTER_ID,
		CKBTC_LEDGER_CANISTER_TESTNET_IDS,
		LOCAL_CKBTC_LEDGER_CANISTER_ID,
		CKERC20_LEDGER_CANISTER_TESTNET_IDS,
		CKERC20_LEDGER_CANISTER_IDS
	} from '$env/networks/networks.icrc.env';
	import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
	import { BigNumber } from '@ethersproject/bignumber';
	import { formatToken } from '$lib/utils/format.utils';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { nonNullish } from '@dfinity/utils';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	export let airdrop: AirdropDescription;

	let ckBtcReward: BigNumber;
	$: ckBtcReward = BigNumber.from(0);
	let ckUsdcReward: BigNumber;
	$: ckUsdcReward = BigNumber.from(0);
	let icpReward: BigNumber;
	$: icpReward = BigNumber.from(0);

	let loading: boolean;
	$: loading = true;

	const loadRewardsUserInfo = async () => {
		const data = await getUserInfo({ identity: $authIdentity });

		console.log(data);

		for (let i = 0; i < (data.usage_awards[0] || []).length; i++) {
			const aw = data.usage_awards[0]?.[i];
			if (nonNullish(aw)) {
				const canisterId = aw.ledger.toText();
				console.log('canisterId ' + i, canisterId);
				if (
					CKBTC_LEDGER_CANISTER_IDS.includes(canisterId) ||
					STAGING_CKBTC_LEDGER_CANISTER_ID === canisterId ||
					CKBTC_LEDGER_CANISTER_TESTNET_IDS.includes(canisterId) ||
					LOCAL_CKBTC_LEDGER_CANISTER_ID === canisterId
				) {
					ckBtcReward = BigNumber.from(ckBtcReward).add(aw.amount);
				} else if (ICP_LEDGER_CANISTER_ID.includes(canisterId)) {
					icpReward = BigNumber.from(ckBtcReward).add(aw.amount);
				} else if (
					LOCAL_CKUSDC_LEDGER_CANISTER_ID === canisterId ||
					CKERC20_LEDGER_CANISTER_TESTNET_IDS.includes(canisterId) ||
					CKERC20_LEDGER_CANISTER_IDS.includes(canisterId)
				) {
					ckUsdcReward = BigNumber.from(ckBtcReward).add(aw.amount);
				} else {
					console.warn('Ledger canister mapping not found for: ' + canisterId);
				}
			}
		}

		loading = false;
	};

	onMount(loadRewardsUserInfo);
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-center text-xl" slot="title">{airdrop.title}</span>

	<ContentWithToolbar>
		<AirdropBanner />

		<div class="flex w-full gap-2">
			<div
				class="w-1/3 rounded-xl bg-success-primary p-5 font-bold text-primary-inverted"
				class:transition={loading}
				class:duration-500={loading}
				class:ease-in-out={loading}
				class:animate-pulse={loading}
			>
				{#if loading}
					<SkeletonText />
				{:else}
					{formatToken({
						value: ckBtcReward,
						unitName: 8,
						displayDecimals: EIGHT_DECIMALS,
						showPlusSign: true
					})} ckBTC
				{/if}
			</div>
			<div
				class="w-1/3 rounded-xl bg-success-primary p-5 font-bold text-primary-inverted"
				class:transition={loading}
				class:duration-500={loading}
				class:ease-in-out={loading}
				class:animate-pulse={loading}
			>
				{#if loading}
					<SkeletonText />
				{:else}
					{formatToken({
						value: ckUsdcReward,
						unitName: 6,
						displayDecimals: EIGHT_DECIMALS,
						showPlusSign: true
					})} ckUSDC
				{/if}
			</div>
			<div
				class="w-1/3 rounded-xl bg-success-primary p-5 font-bold text-primary-inverted"
				class:transition={loading}
				class:duration-500={loading}
				class:ease-in-out={loading}
				class:animate-pulse={loading}
				>{#if loading}
					<SkeletonText />
				{:else}
					{formatToken({
						value: icpReward,
						unitName: 8,
						displayDecimals: EIGHT_DECIMALS,
						showPlusSign: true
					})} ICP
				{/if}
			</div>
		</div>

		<span class="text-lg font-semibold">{$i18n.airdrops.text.participate_title}</span>
		<p class="mb-0 mt-2">{airdrop.description}</p>

		<ExternalLink
			href={airdrop.learnMoreHref}
			ariaLabel={$i18n.airdrops.text.learn_more}
			iconVisible={false}
			asButton
			styleClass={`rounded-xl px-3 py-2 secondary-light`}
		>
			{$i18n.airdrops.text.learn_more}
		</ExternalLink>

		<Share text={$i18n.airdrops.text.share} href={airdrop.campaignHref} styleClass="mt-2" />

		<AirdropsRequirements {airdrop} />

		<Button paddingSmall type="button" fullWidth on:click={modalStore.close} slot="toolbar">
			{$i18n.airdrops.text.modal_button_text}
		</Button>
	</ContentWithToolbar>
</Modal>
