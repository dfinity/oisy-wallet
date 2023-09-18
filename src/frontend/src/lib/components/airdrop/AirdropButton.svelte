<script lang="ts">
	import { AIRDROP } from '$lib/constants/airdrop.constants';
    import IconCelebrate from "$lib/components/icons/IconCelebrate.svelte";
</script>

{#if AIRDROP}
	<button class="airdrop full center mt-3"><IconCelebrate /> Airdrop status <span class="text-blue">Check</span></button>
{/if}
