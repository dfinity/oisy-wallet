<script lang="ts">
	import type { Verify } from '@walletconnect/types';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { CONTEXT_VALIDATION_ISSCAM } from '$eth/constants/wallet-connect.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Option } from '$lib/types/utils';

	export let proposal: Option<Web3WalletTypes.SessionProposal>;

	let context: Verify.Context | undefined = undefined;
	$: context = proposal?.verifyContext;

	let validation: 'UNKNOWN' | 'VALID' | 'INVALID' | string | undefined;
	$: validation = context?.verified.validation;
</script>

<div class="mt-6">
	<label for="verification" class="font-bold"
		>{$i18n.wallet_connect.domain.title}:
		{#if validation === 'VALID'}
			{$i18n.wallet_connect.domain.valid}
		{:else if validation === 'INVALID'}
			{$i18n.wallet_connect.domain.invalid}
		{:else if validation?.toUpperCase() === CONTEXT_VALIDATION_ISSCAM}
			{$i18n.wallet_connect.domain.security_risk}
		{:else}
			{$i18n.wallet_connect.domain.unknown}
		{/if}</label
	>
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
