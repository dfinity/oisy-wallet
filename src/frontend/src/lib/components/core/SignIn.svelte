<script lang="ts">
	import splash from '$lib/assets/splash.png';
	import { signIn } from '$lib/services/auth.services';
	import IcButton from '$lib/components/ui/IcButton.svelte';
	import Img from '$lib/components/ui/Img.svelte';
</script>

<section class="flex flex-col justify-center items-center">
	<Img src={splash} loading="eager" />

	<h1 class="text-center py-4 xs:px-8 sm:px-4">
		Fully on-chain ETH Wallet built on the Internet Computer
	</h1>

	<IcButton on:click={async () => await signIn({})}>
		<svelte:fragment slot="action">Connect with</svelte:fragment>
		Internet Identity
	</IcButton>
</section>
