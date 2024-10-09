<script lang="ts">
	import IconLab from '$lib/components/icons/IconLab.svelte';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';

	// TODO: this should be an URL
	const open = () => window.open('https://shsda-3aaaa-aaaal-amg6q-cai.icp0.io', '_blank');
</script>

<ButtonHero on:click={open} ariaLabel="Have fun">
	<IconLab slot="icon" />
	Lab
</ButtonHero>
