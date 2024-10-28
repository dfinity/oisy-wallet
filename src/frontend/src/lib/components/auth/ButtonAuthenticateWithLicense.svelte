<script lang="ts">
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let fullWidth = false;
	export let licenseAlignment: 'inherit' | 'center' = 'inherit';
</script>

<div class="ali flex w-full flex-col">
	<ButtonAuthenticate on:click={async () => await signIn({})} {fullWidth} />

	<span
		class={`mt-4 flex flex-col text-sm text-aurometalsaurus ${licenseAlignment === 'center' ? 'text-center' : ''}`}
	>
		{$i18n.license_agreement.text.accept_terms}

		<a
			href="/license-agreement"
			aria-label={replaceOisyPlaceholders($i18n.license_agreement.alt.license_agreement)}
		>
			{$i18n.license_agreement.text.accept_terms_link}
		</a>
	</span>
</div>
