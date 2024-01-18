<script lang="ts">
	export let erc20Icp: boolean;
</script>

{#if erc20Icp}
	Convert to native ICP
{:else}
	Convert to ckETH
{/if}
