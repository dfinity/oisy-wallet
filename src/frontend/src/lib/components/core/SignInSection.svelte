<script lang="ts">
	import { signIn } from '$lib/services/auth.services';
	import ButtonIC from '$lib/components/ui/ButtonIC.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
</script>

<section class="flex flex-col justify-center items-center sm:pt-0 sm:pb-8 relative z-1">
	<OisyWalletLogo size="66" />

	<h1 class="text-center py-4 xs:px-3 sm:px-4 mb-0.25" style="max-width: 600px">
		Non-custodial, browser-based wallet, Internet Computer secured
	</h1>

	<p class="text-center pb-4 xs:px-3 sm:px-4 mb-0.25" style="max-width: 600px">
		{OISY_NAME} provides a seamless on-chain experience to manage your Ethereum assets. Using native
		web technologies and advanced cryptography, {OISY_NAME} eliminates the need for browser extensions
		or mobile apps.
	</p>

	<ButtonIC on:click={async () => await signIn({})}>
		<svelte:fragment slot="action">Connect with</svelte:fragment>
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
