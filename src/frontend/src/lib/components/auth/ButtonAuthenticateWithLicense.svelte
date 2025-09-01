<script lang="ts">
	import SigningInHelpLink from '$lib/components/auth/SigningInHelpLink.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { AUTH_LICENSE_LINK, AUTH_SIGNING_IN_HELP_LINK } from '$lib/constants/test-ids.constants';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	// TODO: remove this component once NEW_AGREEMENTS feature is implemented and live

	interface Props {
		fullWidth?: boolean;
		licenseAlignment?: 'inherit' | 'center';
		needHelpLink?: boolean;
	}

	let { fullWidth = false, licenseAlignment = 'inherit', needHelpLink = true }: Props = $props();

	const modalId = Symbol();

	const onclick = async () => {
		const { success } = await signIn({  });

		if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};
</script>

<div
	class="flex w-full flex-col items-center md:items-start"
	class:md:items-center={licenseAlignment === 'center'}
>
	<ButtonAuthenticate {fullWidth} {onclick} />

	<span
		class="mt-4 flex flex-col text-sm text-tertiary"
		class:text-center={licenseAlignment === 'center'}
		class:w-full={fullWidth}
	>
		{$i18n.license_agreement.text.accept_terms}

		<LicenseLink testId={AUTH_LICENSE_LINK} />

		{#if needHelpLink}
			<SigningInHelpLink styleClass="mt-4" testId={AUTH_SIGNING_IN_HELP_LINK} />
		{/if}
	</span>
</div>
