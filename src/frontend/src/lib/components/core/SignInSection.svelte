<script lang="ts">
	import { signIn } from '$lib/services/auth.services';
	import ButtonIC from '$lib/components/ui/ButtonIC.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
</script>

<section class="flex flex-col justify-center items-center sm:pt-6 mt-6 relative z-1">
	<OisyWalletLogo size="66" />

	<h1 class="text-center py-4 xs:px-2 sm:px-4 mb-0.25" style="max-width: 600px">
		Non-custodial, Browser-based Wallet, Internet Computer Secured
	</h1>

	<p class="text-center pb-4 xs:px-2 sm:px-4 mb-0.25" style="max-width: 600px">
		Merging Ethereum and the Internet Computer, OISY provides a seamless on-chain experience,
		eliminating the need for browser-extensions or mobile apps; it's passkey-enabled.
	</p>

	<ButtonIC on:click={async () => await signIn({})}>
		<svelte:fragment slot="action">Connect with</svelte:fragment>
		Internet Identity
	</ButtonIC>
</section>
