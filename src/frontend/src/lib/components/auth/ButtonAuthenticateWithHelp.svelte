<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ButtonsSignIn from '$lib/components/auth/ButtonsSignIn.svelte';
	import SigningInHelpLink from '$lib/components/auth/SigningInHelpLink.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { authLocked } from '$lib/stores/locked.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { tokenCategoryFilterStore, tokensSortStore } from '$lib/stores/settings.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
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

			transactionsFilterStore.clear();
		} else if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};
</script>

<div
	class="flex w-full flex-col items-center gap-4"
	class:md:items-start={helpAlignment !== 'center'}
>
	<ButtonsSignIn
		{fullWidth}
		justify={helpAlignment === 'center' ? 'center' : 'start'}
		{onAuthenticate}
	/>

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
