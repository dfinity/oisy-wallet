<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { PERSONAL_NOTES_ENABLED } from '$env/personal-notes.env';
	import EthHideTokenModal from '$eth/components/tokens/EthHideTokenModal.svelte';
	import IcHideTokenModal from '$icp/components/tokens/IcHideTokenModal.svelte';
	import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';
	import DappModalDetails from '$lib/components/dapps/DappModalDetails.svelte';
	import NftImageConsentModal from '$lib/components/nfts/NftImageConsentModal.svelte';
	import NotesModal from '$lib/components/notes/NotesModal.svelte';
	import PayDialog from '$lib/components/pay/PayDialog.svelte';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import ReferralCodeModal from '$lib/components/referral/ReferralCodeModal.svelte';
	import ScannerModal from '$lib/components/scanner/ScannerModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import FullscreenMediaModal from '$lib/components/ui/FullscreenMediaModal.svelte';
	import VipQrCodeModal from '$lib/components/vip/VipQrCodeModal.svelte';
	import WalletConnectSessionsModal from '$lib/components/wallet-connect/WalletConnectSessionsModal.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import {
		modalDAppDetails,
		modalHideToken,
		modalIcHideToken,
		modalSolHideToken,
		modalSolHideTokenData,
		modalVipQrCode,
		modalSettingsState,
		modalReferralCode,
		modalAddressBook,
		modalNotes,
		modalVipQrCodeData,
		modalIcHideTokenData,
		modalHideTokenData,
		modalNftImageConsent,
		modalNftImageConsentData,
		modalNftFullscreenDisplayData,
		modalNftFullscreenDisplayOpen,
		modalReceive,
		modalReceiveId,
		modalPayDialogOpen,
		modalSend,
		modalSendData,
		modalUniversalScannerOpen,
		modalWalletConnectSessions
	} from '$lib/derived/modal.derived';
	import { getSymbol } from '$lib/utils/modal.utils';
	import SolHideTokenModal from '$sol/components/tokens/SolHideTokenModal.svelte';

	/**
	 * Modals that must be declared at the root of the layout if they are used across routes - available on navigation.
	 */
</script>

{#if $authSignedIn}
	{#if $modalHideToken}
		<EthHideTokenModal fromRoute={$modalHideTokenData} />
	{:else if $modalIcHideToken}
		<IcHideTokenModal fromRoute={$modalIcHideTokenData} />
	{:else if $modalSolHideToken}
		<SolHideTokenModal fromRoute={$modalSolHideTokenData} />
	{:else if $modalDAppDetails}
		<DappModalDetails />
	{:else if $modalVipQrCode && nonNullish($modalVipQrCodeData)}
		<VipQrCodeModal codeType={$modalVipQrCodeData} />
	{:else if $modalSettingsState}
		<SettingsModal />
	{:else if $modalReferralCode}
		<ReferralCodeModal />
	{:else if $modalAddressBook}
		<AddressBookModal />
	{:else if PERSONAL_NOTES_ENABLED && $modalNotes}
		<NotesModal />
	{:else if $modalNftImageConsent && nonNullish($modalNftImageConsentData)}
		<NftImageConsentModal collection={$modalNftImageConsentData} />
	{:else if $modalNftFullscreenDisplayOpen && nonNullish($modalNftFullscreenDisplayData?.imageUrl)}
		<FullscreenMediaModal mediaSrc={$modalNftFullscreenDisplayData.imageUrl} />
	{:else if $modalReceive && $modalReceiveId === getSymbol('menu-addresses')}
		<ReceiveAddressModal infoCmp={ReceiveAddresses} />
	{:else if $modalPayDialogOpen}
		<PayDialog />
	{:else if $modalSend && nonNullish($modalSendData)}
		<SendModal isNftsPage={false} isTransactionsPage={false} />
	{:else if $modalUniversalScannerOpen}
		<ScannerModal />
	{:else if $modalWalletConnectSessions}
		<WalletConnectSessionsModal />
	{/if}
{/if}
