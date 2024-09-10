<script lang="ts">
	import { IconWallet } from '@dfinity/gix-components';
	import IconArrowAstronaut from '$lib/components/icons/IconArrowAstronaut.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<h2 class="text-center mb-6">Authenticate to connect</h2>

<div class="bg-light-blue p-6 mb-6 rounded-lg">
	<p class="break-normal font-bold">By connecting, the dApp will:</p>

	<p class="break-normal pt-2.5 flex items-center gap-2">
		<IconWallet /> Learn your Oisy wallet address
	</p>

	<p class="break-normal pt-2.5 flex items-center gap-2">
		<IconWallet /> Initiate transaction to approve in Oisy
	</p>
</div>

<button class="primary full center text-center" on:click={async () => await signIn({})}
	>{$i18n.auth.text.authenticate} <IconArrowAstronaut /></button
>
