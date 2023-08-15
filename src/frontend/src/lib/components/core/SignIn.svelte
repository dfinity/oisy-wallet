<script lang="ts">
	import splash from '$lib/assets/splash.png';
	import { signIn } from '$lib/services/auth.services';
</script>

<section class="flex flex-col justify-center aligns-center">
	<img src={splash} role="presentation" alt="" decoding="async" />

	<h1 class="text-center py-4">Fully on-chain ETH Wallet built on the Internet Computer</h1>

	<button on:click={signIn}>Sign-in</button>
</section>
