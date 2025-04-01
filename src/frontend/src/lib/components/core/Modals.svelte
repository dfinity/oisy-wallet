<script lang="ts">
	import HideTokenModal from '$eth/components/tokens/HideTokenModal.svelte';
	import IcHideTokenModal from '$icp/components/tokens/IcHideTokenModal.svelte';
	import DappModalDetails from '$lib/components/dapps/DappModalDetails.svelte';
	import VipQrCodeModal from '$lib/components/qr/VipQrCodeModal.svelte';
	import ReferralCodeModal from '$lib/components/referral/ReferralCodeModal.svelte';
	import AirdropModalDetails from '$lib/components/rewards/RewardModalDetails.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import {
		modalDAppDetails,
		modalHideToken,
		modalIcHideToken,
		modalVipQrCode,
		modalRewardDetails,
		modalSettingsState,
		modalReferralCode
	} from '$lib/derived/modal.derived';

	/**
	 * Modals that must be declared at the root of the layout if they are used across routes - available on navigation.
	 */
</script>

{#if $authSignedIn}
	{#if $modalHideToken}
		<HideTokenModal />
	{:else if $modalIcHideToken}
		<IcHideTokenModal />
	{:else if $modalDAppDetails}
		<DappModalDetails />
	{:else if $modalRewardDetails}
		<AirdropModalDetails />
	{:else if $modalVipQrCode}
		<VipQrCodeModal />
	{:else if $modalSettingsState}
		<SettingsModal />
	{:else if $modalReferralCode}
		<ReferralCodeModal />
	{/if}
{/if}
