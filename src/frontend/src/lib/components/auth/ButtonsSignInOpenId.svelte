<script lang="ts">
	import IconApple from '$lib/components/icons/IconApple.svelte';
	import IconGoogle from '$lib/components/icons/IconGoogle.svelte';
	import IconMicrosoft from '$lib/components/icons/IconMicrosoft.svelte';
	import {
		LOGIN_BUTTON_APPLE,
		LOGIN_BUTTON_GOOGLE,
		LOGIN_BUTTON_MICROSOFT
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OpenIdProvider } from '$lib/types/auth';

	interface Props {
		onProviderSelected: (provider: OpenIdProvider) => void;
		variant?: 'login' | 'lock';
		rowBreakpoint?: 'sm' | 'md';
	}

	let { onProviderSelected, variant = 'login', rowBreakpoint = 'md' }: Props = $props();

	// One-Click sign-in providers — see `@icp-sdk/auth` v6 `OpenIdProvider`.
	// Internet Identity 2.0 performs the OIDC flow against these and returns
	// a delegation that is indistinguishable from a passkey-based II sign-in.
	const providers = $derived([
		{
			provider: 'google' as const,
			icon: IconGoogle,
			ariaLabel: $i18n.auth.alt.sign_in_with_google,
			testId: LOGIN_BUTTON_GOOGLE
		},
		{
			provider: 'apple' as const,
			icon: IconApple,
			ariaLabel: $i18n.auth.alt.sign_in_with_apple,
			testId: LOGIN_BUTTON_APPLE
		},
		{
			provider: 'microsoft' as const,
			icon: IconMicrosoft,
			ariaLabel: $i18n.auth.alt.sign_in_with_microsoft,
			testId: LOGIN_BUTTON_MICROSOFT
		}
	]);

	const variantClasses = $derived(
		variant === 'lock'
			? 'bg-brand-subtle-10 hover:bg-brand-subtle-20 focus-visible:outline-brand-primary'
			: 'bg-primary border border-brand-subtle-20 hover:border-brand-primary-alt focus-visible:outline-brand-primary-alt'
	);
</script>

<div
	class="flex items-center justify-center gap-4"
	class:md:gap-1={rowBreakpoint === 'md' && variant === 'lock'}
	class:sm:gap-1={rowBreakpoint === 'sm' && variant === 'lock'}
>
	{#each providers as { provider, icon: Icon, ariaLabel, testId } (provider)}
		<button
			class={`flex size-14 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${variantClasses}`}
			aria-label={ariaLabel}
			data-tid={testId}
			onclick={() => onProviderSelected(provider)}
			type="button"
		>
			<Icon size="20" />
		</button>
	{/each}
</div>
