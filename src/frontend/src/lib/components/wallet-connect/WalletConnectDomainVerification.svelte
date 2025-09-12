<script lang="ts">
	import type { WalletKitTypes } from '@reown/walletkit';
	import type { Verify } from '@walletconnect/types';
	import { run } from 'svelte/legacy';
	import { CONTEXT_VALIDATION_ISSCAM } from '$lib/constants/wallet-connect.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Option } from '$lib/types/utils';

	interface Props {
		proposal: Option<WalletKitTypes.SessionProposal>;
	}

	let { proposal }: Props = $props();

	let context = $derived(proposal?.verifyContext);

	let validation = $derived(context?.verified.validation);
</script>

<div class="mt-6">
	<label class="font-bold" for="verification"
		>{$i18n.wallet_connect.domain.title}:
		{#if validation === 'VALID'}
			{$i18n.wallet_connect.domain.valid}
		{:else if validation === 'INVALID'}
			{$i18n.wallet_connect.domain.invalid}
		{:else if validation?.toUpperCase() === CONTEXT_VALIDATION_ISSCAM}
			{$i18n.wallet_connect.domain.security_risk}
		{:else}
			{$i18n.wallet_connect.domain.unknown}
		{/if}
	</label>
	<div id="verification" class="mb-4 break-all font-normal">
		{#if validation === 'VALID'}
			{$i18n.wallet_connect.domain.valid_description}
		{:else if validation === 'INVALID'}
			{$i18n.wallet_connect.domain.invalid_description}
		{:else if validation?.toUpperCase() === CONTEXT_VALIDATION_ISSCAM}
			{$i18n.wallet_connect.domain.security_risk_description}
		{:else}
			{$i18n.wallet_connect.domain.unknown_description}
		{/if}
	</div>
</div>
