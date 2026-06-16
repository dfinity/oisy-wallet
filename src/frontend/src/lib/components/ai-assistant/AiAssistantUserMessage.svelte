<script lang="ts">
	interface Props {
		content: string;
	}

	let { content }: Props = $props();
</script>

<div class="mb-5 flex w-full justify-end text-sm">
	<div
		class="message bg-brand-primary text-primary-inverted flex w-[85%] flex-col justify-center rounded-xl rounded-tr-none px-3 py-4"
	>
		{content}
	</div>
</div>

<style lang="scss">
	.message::selection {
		background: var(--color-foreground-tertiary-inverted);
		color: var(--color-foreground-primary-inverted);
	}
</style>
