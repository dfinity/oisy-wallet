<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import SigningInHelpLink from '$lib/components/auth/SigningInHelpLink.svelte';
	import IconAstronautArrow from '$lib/components/icons/icon-astronaut/IconAstronautArrow.svelte';
	import TermsOfUseLink from '$lib/components/terms-of-use/TermsOfUseLink.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { AUTH_SIGNING_IN_HELP_LINK, LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
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
		asPopup?: boolean;
	}

	let {
		fullWidth = false,
		helpAlignment = 'inherit',
		needHelpLink = true,
		asPopup = false
	}: Props = $props();

	const modalId = Symbol();

	const onAuthenticate = async (domain: InternetIdentityDomain) => {
		const { success } = await signIn({
			domain,
			asPopup
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
		onclick={() => onAuthenticate(InternetIdentityDomain.VERSION_2_0)}
		styleClass="bg-brand-primary text-primary-inverted"
		testId={LOGIN_BUTTON}
	>
		{$i18n.auth.text.authenticate}
		<IconAstronautArrow />
	</ButtonAuthenticate>

	<span
		class="mt-4 flex flex-col text-sm text-tertiary"
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
