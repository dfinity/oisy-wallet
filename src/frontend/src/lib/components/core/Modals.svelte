<script lang="ts">
	import HideTokenModal from '$eth/components/tokens/HideTokenModal.svelte';
	import IcHideTokenModal from '$icp/components/tokens/IcHideTokenModal.svelte';
	import DappModalDetails from '$lib/components/dapps/DappModalDetails.svelte';
	import VipQrCodeModal from '$lib/components/qr/VipQrCodeModal.svelte';
	import AirdropModalDetails from '$lib/components/rewards/RewardModalDetails.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import {
		modalDAppDetails,
		modalHideToken,
		modalIcHideToken,
		modalVipQrCode,
		modalRewardDetails,
		modalDropdown
	} from '$lib/derived/modal.derived';
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';

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
	{:else if $modalDropdown}
		<Responsive down="md">
			<Modal on:nnsClose={modalStore.close}>
				<slot name="title" slot="title" />

				<slot name="items" />
			</Modal>
		</Responsive>
	{/if}
{/if}
