<script lang="ts">
	import type { Nullish } from '@dfinity/zod-schemas';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		proposal: Nullish<WalletKitTypes.SessionProposal>;
	}

	let { proposal }: Props = $props();

	let context = $derived(proposal?.verifyContext);

	let validation = $derived(context?.verified.validation);

	// Checked first: a flagged site served from its own domain still validates as VALID.
	let isScam = $derived(context?.verified.isScam === true);
</script>

<div class="mt-6">
	<label class="font-bold" for="verification"
		>{$i18n.wallet_connect.domain.title}:
		{#if isScam}
			{$i18n.wallet_connect.domain.security_risk}
		{:else if validation === 'VALID'}
			{$i18n.wallet_connect.domain.valid}
		{:else if validation === 'INVALID'}
			{$i18n.wallet_connect.domain.invalid}
		{:else}
			{$i18n.wallet_connect.domain.unknown}
		{/if}
	</label>
	<div id="verification" class="mb-4 font-normal break-all">
		{#if isScam}
			{$i18n.wallet_connect.domain.security_risk_description}
		{:else if validation === 'VALID'}
			{$i18n.wallet_connect.domain.valid_description}
		{:else if validation === 'INVALID'}
			{$i18n.wallet_connect.domain.invalid_description}
		{:else}
			{$i18n.wallet_connect.domain.unknown_description}
		{/if}
	</div>
</div>
