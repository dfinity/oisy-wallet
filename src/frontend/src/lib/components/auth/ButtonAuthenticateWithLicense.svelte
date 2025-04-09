<script lang="ts">
	import SigningInHelpLink from '$lib/components/auth/SigningInHelpLink.svelte';
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { TRACK_COUNT_SIGN_IN_CLICK } from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	export let fullWidth = false;
	export let licenseAlignment: 'inherit' | 'center' = 'inherit';

	const onClick = async () => {
		await trackEvent({
			name: TRACK_COUNT_SIGN_IN_CLICK
		});

		const { success } = await signIn({});
		if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp(false);
		}
	};
</script>

<div
	class="flex w-full flex-col items-center md:items-start"
	class:md:items-center={licenseAlignment === 'center'}
>
	<ButtonAuthenticate on:click={onClick} {fullWidth} />

	<span
		class={`mt-4 flex flex-col text-sm text-tertiary ${licenseAlignment === 'center' ? 'text-center' : ''}`}
	>
		{$i18n.license_agreement.text.accept_terms}

		<LicenseLink />
		<SigningInHelpLink styleClass="mt-4" />
	</span>
</div>
