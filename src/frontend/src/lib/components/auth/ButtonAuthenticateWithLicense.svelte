<script lang="ts">
	import LicenseLink from '$lib/components/license-agreement/LicenseLink.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';

	export let fullWidth = false;
	export let licenseAlignment: 'inherit' | 'center' = 'inherit';
</script>

<div class="flex w-full flex-col">
	<ButtonAuthenticate on:click={async () => await signIn({})} {fullWidth} />

	<span
		class={`mt-4 flex flex-col text-sm text-tertiary ${licenseAlignment === 'center' ? 'text-center' : ''}`}
	>
		{$i18n.license_agreement.text.accept_terms}

		<LicenseLink />
	</span>
</div>
