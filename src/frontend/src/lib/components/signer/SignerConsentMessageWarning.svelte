<script lang="ts">
	import type { ResultConsentInfo } from '@dfinity/oisy-wallet-signer';
	import { nonNullish } from '@dfinity/utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let consentInfo: ResultConsentInfo | undefined;

	// The ICRC-49 standard specifies that a user should be warned when a consent message is interpreted on the frontend side instead of being retrieved through a canister.
	// See https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_49_call_canister.md#message-processing
	let displayWarning: boolean | undefined;
	$: displayWarning = nonNullish(consentInfo) && 'Warn' in consentInfo;
</script>

{#if displayWarning}
	<MessageBox level="light-warning"
		>{$i18n.signer.consent_message.warning.token_without_consent_message}</MessageBox
	>
{/if}
