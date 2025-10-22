<script lang="ts">
	interface Props {
		content: string;
	}

	let { content }: Props = $props();
</script>

<div class="mb-5 flex w-full justify-end text-sm">
	<div
		class="message flex w-[85%] flex-col justify-center rounded-xl rounded-tr-none bg-brand-primary px-3 py-4 text-primary-inverted"
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
