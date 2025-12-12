<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { PRIMARY_INTERNET_IDENTITY_VERSION } from '$env/auth.env';
	import SigningInHelpLink from '$lib/components/auth/SigningInHelpLink.svelte';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL } from '$lib/constants/oisy.constants';
	import { AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { authLocked } from '$lib/stores/locked.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { InternetIdentityDomain } from '$lib/types/auth';
	import { componentToHtml } from '$lib/utils/component.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		fullWidth?: boolean;
		helpAlignment?: 'inherit' | 'center';
		needHelpLink?: boolean;
	}

	let { fullWidth = false, helpAlignment = 'inherit', needHelpLink = true }: Props = $props();

	const modalId = Symbol();

	const isPrimaryIdentityVersion2 = PRIMARY_INTERNET_IDENTITY_VERSION === '2.0';

	const onAuthenticate = async (domain: InternetIdentityDomain) => {
		const { success } = await signIn({
			domain
		});

		if (success === 'ok') {
			authLocked.unlock({ source: 'login from landing page' });
		} else if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};
</script>

<div
	class="flex w-full flex-col items-center md:items-start"
	class:md:items-center={helpAlignment === 'center'}
>
	<ButtonAuthenticate
		{fullWidth}
		onclick={() =>
			onAuthenticate(
				isPrimaryIdentityVersion2
					? InternetIdentityDomain.VERSION_2_0
					: InternetIdentityDomain.VERSION_1_0
			)}
	/>

	{#if isPrimaryIdentityVersion2}
		<div
			class="mt-2 flex w-full items-center justify-center gap-2 text-sm font-bold text-brand-primary sm:w-80"
		>
			<ExternalLink
				ariaLabel={$i18n.auth.text.sign_in_with_identity_number}
				href={OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL}
				iconVisible={false}
			>
				<IconHelp size="18" />
			</ExternalLink>

			<button
				aria-label={$i18n.auth.text.sign_in_with_identity_number}
				onclick={() => onAuthenticate(InternetIdentityDomain.VERSION_1_0)}
			>
				{$i18n.auth.text.sign_in_with_identity_number}
			</button>
		</div>
	{/if}

	<span
		class="mt-4 flex flex-col text-sm text-tertiary"
		class:sm:w-80={!fullWidth}
		class:text-center={helpAlignment === 'center'}
		class:w-full={fullWidth}
	>
		<span class="inline-block">
			<Html
				text={replacePlaceholders(
					isPrimaryIdentityVersion2
						? $i18n.terms_of_use.text.instruction_two_buttons
						: $i18n.terms_of_use.text.instruction,
					{
						$link: componentToHtml({ Component: TermsOfUseLink })
					}
				)}
			/>
		</span>

		{#if needHelpLink}
			<SigningInHelpLink styleClass="mt-4" testId={AUTH_SIGNING_IN_HELP_LINK} />
		{/if}
	</span>
</div>
