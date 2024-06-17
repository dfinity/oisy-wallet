<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import chainFusionTestnet from '$lib/assets/chain_fusion_testnet.svg';

	export let isTestnet: boolean;
</script>

<NetworkButton
	id={undefined}
	name={$i18n.networks.chain_fusion}
	icon={isTestnet ? chainFusionTestnet : chainFusion}
	on:icSelected
/>
