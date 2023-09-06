<script lang="ts">
	import { signIn } from '$lib/services/auth.services';
	import IcButton from '$lib/components/ui/IcButton.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
</script>

<section class="flex flex-col justify-center items-center sm:pt-8 mt-8">
	<OisyWalletLogo size="66" />

	<h1 class="text-center py-4 xs:px-2 sm:px-4 mb-0.25" style="max-width: 600px">
		Say goodbye to browser extensions—enjoy safe fully on-chain experience possible only on the
		Internet Computer
	</h1>

	<IcButton on:click={async () => await signIn({})}>
		<svelte:fragment slot="action">Connect with</svelte:fragment>
		Internet Identity
	</IcButton>
</section>
