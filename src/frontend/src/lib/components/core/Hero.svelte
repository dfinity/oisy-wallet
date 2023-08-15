<script lang="ts">
	import ETHIcon from '$lib/components/icons/ETHIcon.svelte';
	import Address from '$lib/components/dashboard/Address.svelte';
	import Balance from '$lib/components/dashboard/Balance.svelte';
</script>

<article
	class="gix bg-deep-violet text-ghost-white rounded-lg py-8 px-4 my-4 relative"
	style="min-height: 260px"
>
	<div class="absolute" style="top: -3rem; left: 1rem;">
		<ETHIcon />
	</div>

	<Address />

	<Balance />
</article>
