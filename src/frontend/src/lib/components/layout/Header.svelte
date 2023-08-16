<script lang="ts">
	import InternetComputerLogo from '$lib/components/icons/InternetComputerLogo.svelte';
	import { authSignedInStore } from '$lib/stores/auth.store';
	import SignOutButton from '$lib/components/core/SignOutButton.svelte';
</script>

<header class="flex justify-between">
	<div class="hidden md:block md:p-2">
		<InternetComputerLogo />
	</div>

	{#if $authSignedInStore}
		<div style="margin-left: auto">
			<SignOutButton />
		</div>
	{/if}
</header>
