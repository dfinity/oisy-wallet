<script lang="ts">
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import ToolsCanisterTopUp from '$lib/components/tools/ToolsCanisterTopUp.svelte';
</script>

{#if CANISTER_TOP_UP_ENABLED}
	<ToolsCanisterTopUp />
{/if}
