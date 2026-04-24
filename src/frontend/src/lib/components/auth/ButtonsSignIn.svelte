<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import ButtonSignInInternetIdentity from '$lib/components/auth/ButtonSignInInternetIdentity.svelte';
	import ButtonsSignInOpenId from '$lib/components/auth/ButtonsSignInOpenId.svelte';
	import { INTERNET_IDENTITY_CANISTER_ID } from '$lib/constants/app.constants';
	import type { OpenIdProvider } from '$lib/types/auth';

	interface Props {
		onAuthenticate: (params?: { openIdProvider?: OpenIdProvider }) => void;
		variant?: 'login' | 'lock';
		fullWidth?: boolean;
		rowBreakpoint?: 'sm' | 'md';
		justify?: 'center' | 'start';
	}

	let {
		onAuthenticate,
		variant = 'login',
		fullWidth = false,
		rowBreakpoint = 'md',
		justify = 'start'
	}: Props = $props();

	// One-Click OpenID sign-in only targets Internet Identity 2.0 on mainnet
	// (`id.ai`). The local II replica doesn't support the `?openid=...` query
	// param, so we hide the social buttons entirely in local dev.
	const openIdEnabled = $derived(isNullish(INTERNET_IDENTITY_CANISTER_ID));
</script>

<div
	class="flex w-full flex-col items-center gap-4"
	class:md:flex-row={!fullWidth && rowBreakpoint === 'md'}
	class:md:justify-center={!fullWidth && rowBreakpoint === 'md' && justify === 'center'}
	class:md:justify-start={!fullWidth && rowBreakpoint === 'md' && justify === 'start'}
	class:sm:flex-row={!fullWidth && rowBreakpoint === 'sm'}
>
	<ButtonSignInInternetIdentity
		{fullWidth}
		onclick={() => onAuthenticate()}
		{rowBreakpoint}
		{variant}
	/>

	{#if openIdEnabled}
		<div
			class="h-px w-[35px] bg-brand-subtle-20"
			class:md:h-[35px]={!fullWidth && rowBreakpoint === 'md'}
			class:md:w-px={!fullWidth && rowBreakpoint === 'md'}
			class:sm:h-[35px]={!fullWidth && rowBreakpoint === 'sm'}
			class:sm:w-px={!fullWidth && rowBreakpoint === 'sm'}
			aria-hidden="true"
		></div>

		<ButtonsSignInOpenId
			onProviderSelected={(provider) => onAuthenticate({ openIdProvider: provider })}
			{variant}
		/>
	{/if}
</div>
