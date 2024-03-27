<script lang="ts">
	import { signIn } from '$lib/services/auth.services';
	import ButtonIC from '$lib/components/ui/ButtonIC.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<section class="flex flex-col justify-center items-center sm:pt-0 sm:pb-8 relative z-10">
	<OisyWalletLogo size="66" />

	<h1 class="text-center py-8 xs:px-6 sm:px-8 mb-0.5" style="max-width: 600px">
		{$i18n.auth.text.title}
	</h1>

	<p class="text-center pb-8 xs:px-6 sm:px-8 mb-0.5" style="max-width: 600px">
		{replaceOisyPlaceholders($i18n.auth.text.description)}
	</p>

	<ButtonIC on:click={async () => await signIn({})}>
		<svelte:fragment slot="action">{$i18n.auth.text.connect_with}</svelte:fragment>
		Internet Identity
	</ButtonIC>
</section>

<style lang="scss">
	section {
		position: relative;

		margin: var(--padding-6x) 0 0;

		width: 100%;

		@media (min-width: 576px) and (min-height: 600px) {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);

			margin: 0;
		}
	}
</style>
