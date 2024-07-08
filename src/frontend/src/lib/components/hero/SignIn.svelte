<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store.js';
	import { signIn } from '$lib/services/auth.services';
	import icpLight from '$icp/assets/icp_light.svg';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
</script>

<ButtonHero
	on:click={async () => await signIn({})}
	ariaLabel={$i18n.auth.alt.sign_in}
	imgSrc={icpLight}
	imgAlt={$i18n.networks.chain_fusion}>{$i18n.auth.text.connect}</ButtonHero
>
