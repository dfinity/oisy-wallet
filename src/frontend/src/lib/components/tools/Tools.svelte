<script lang="ts">
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import ToolsCanisterTopUp from '$lib/components/tools/ToolsCanisterTopUp.svelte';
	import ToolsExportData from '$lib/components/tools/ToolsExportData.svelte';
</script>

{#if CANISTER_TOP_UP_ENABLED}
	<ToolsCanisterTopUp />
{/if}

<ToolsExportData />
