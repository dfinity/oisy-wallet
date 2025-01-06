<script lang="ts">
	import type { ResultConsentInfo } from '@dfinity/oisy-wallet-signer';
	import { nonNullish } from '@dfinity/utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';

	export let consentInfo: ResultConsentInfo | undefined;

	// The ICRC-49 standard specifies that a user should be warned when a consent message is interpreted on the frontend side instead of being retrieved through a canister.
	// See https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_49_call_canister.md#message-processing
	// The OISY product decision is to display this warning in the UI as an information box.
	let displayInfo: boolean | undefined;
	$: displayInfo = nonNullish(consentInfo) && 'Warn' in consentInfo;
</script>

{#if displayInfo}
	<MessageBox level="info">TODO</MessageBox>
{/if}
