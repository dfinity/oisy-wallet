<div
	role="toolbar"
	class="toolbar w-full px-4 py-6 text-black inline-flex justify-between rounded-[32px] bg-primary"
>
	<slot />
</div>

<style lang="scss">
	.toolbar > :global(:last-child) {
		border: none;
	}
</style>
