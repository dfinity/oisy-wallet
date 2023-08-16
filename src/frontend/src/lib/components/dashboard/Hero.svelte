<script lang="ts">
	import IconETH from '$lib/components/icons/IconETH.svelte';
	import Address from '$lib/components/dashboard/Address.svelte';
	import Balance from '$lib/components/dashboard/Balance.svelte';
	import Actions from '$lib/components/dashboard/Actions.svelte';
</script>

<article
	class="gix bg-deep-violet text-ghost-white rounded-lg pt-8 pb-4 px-4 my-8 md:mt-4 relative"
	style="min-height: 260px"
>
	<div class="absolute" style="top: -3rem; left: 1rem;">
		<IconETH />
	</div>

	<Address />

	<Balance />

	<Actions />
</article>
