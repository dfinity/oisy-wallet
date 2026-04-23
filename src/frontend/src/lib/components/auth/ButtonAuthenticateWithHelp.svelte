<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import {isNullish, nonNullish} from '@dfinity/utils';
	import ButtonSignInInternetIdentity from '$lib/components/auth/ButtonSignInInternetIdentity.svelte';
	import ButtonsSignInOpenId from '$lib/components/auth/ButtonsSignInOpenId.svelte';
	import SigningInHelpLink from '$lib/components/auth/SigningInHelpLink.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import { INTERNET_IDENTITY_CANISTER_ID } from '$lib/constants/app.constants';
	import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { authLocked } from '$lib/stores/locked.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { tokenCategoryFilterStore, tokensSortStore } from '$lib/stores/settings.store';
	import { InternetIdentityDomain, type OpenIdProvider } from '$lib/types/auth';
	import { componentToHtml } from '$lib/utils/component.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		fullWidth?: boolean;
		helpAlignment?: 'inherit' | 'center';
		needHelpLink?: boolean;
		asPopup?: boolean;
	}

	let {
		fullWidth = false,
		helpAlignment = 'inherit',
		needHelpLink = true,
		asPopup = false
	}: Props = $props();

	const modalId = Symbol();

	// One-Click OpenID sign-in only targets Internet Identity 2.0 on mainnet
	// (`id.ai`). The local II replica doesn't support the `?openid=...` query
	// param, so we hide the social buttons entirely in local dev.
	const openIdEnabled = $derived(isNullish(INTERNET_IDENTITY_CANISTER_ID));

	const onAuthenticate = async ({ openIdProvider }: { openIdProvider?: OpenIdProvider } = {}) => {
		const { success } = await signIn({
			domain: InternetIdentityDomain.VERSION_2_0,
			asPopup,
			...(nonNullish(openIdProvider) ? { openIdProvider } : {})
		});

		if (success === 'ok') {
			authLocked.unlock({ source: 'login from landing page' });

			tokensSortStore.reset({ key: 'tokens-sort' });

			tokenCategoryFilterStore.reset({ key: 'token-category-filter' });
		} else if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};
</script>

<div
	class="flex w-full flex-col items-center gap-4"
	class:md:items-start={helpAlignment !== 'center'}
>
	<div
		class="flex w-full flex-col items-center gap-4"
		class:md:flex-row={!fullWidth}
		class:md:justify-center={!fullWidth && helpAlignment === 'center'}
		class:md:justify-start={!fullWidth && helpAlignment !== 'center'}
	>
		<ButtonSignInInternetIdentity {fullWidth} onclick={() => onAuthenticate()} />

		{#if openIdEnabled}
			<div
				class="h-px w-[35px] bg-brand-subtle-20"
				class:md:h-[35px]={!fullWidth}
				class:md:w-px={!fullWidth}
				aria-hidden="true"
			></div>

			<ButtonsSignInOpenId
				onProviderSelected={(provider) => onAuthenticate({ openIdProvider: provider })}
			/>
		{/if}
	</div>

	<span
		class="flex flex-col text-sm text-tertiary"
		class:sm:w-85={!fullWidth}
		class:text-center={helpAlignment === 'center'}
		class:w-full={fullWidth}
	>
		<span class="inline-block">
			<Html
				text={replacePlaceholders($i18n.terms_of_use.text.instruction, {
					$link: componentToHtml({ Component: TermsOfUseLink })
				})}
			/>
		</span>

		{#if needHelpLink}
			<SigningInHelpLink styleClass="mt-4" testId={AUTH_SIGNING_IN_HELP_LINK} />
		{/if}
	</span>
</div>
