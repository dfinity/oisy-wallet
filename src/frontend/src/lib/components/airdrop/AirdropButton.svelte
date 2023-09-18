<script lang="ts">
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import IconCelebrate from '$lib/components/icons/IconCelebrate.svelte';
	import { airdropAvailable } from '$lib/derived/airdrop.derived';
	import { fade } from 'svelte/transition';
</script>

{#if AIRDROP && $airdropAvailable}
	<button class="airdrop full center mt-3" in:fade
		><IconCelebrate /> Airdrop status <span class="text-blue">Check</span></button
	>
{/if}
