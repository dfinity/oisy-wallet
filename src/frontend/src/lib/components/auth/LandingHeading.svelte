<script lang="ts">
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		id: string;
		title: string;
		eyebrow?: string;
		description?: string;
		onNavy?: boolean;
		styleClass?: string;
		reveal?: Attachment<HTMLElement>;
	}

	let { id, title, eyebrow, description, onNavy = false, styleClass, reveal }: Props = $props();
</script>

<!-- No wrapper: each section groups these blocks with its own layout and reveal timing. -->
{#if eyebrow !== undefined}
	<p
		class={[
			'm-0 text-xs font-bold tracking-[0.2em]',
			onNavy ? 'text-(--landing-sky)' : 'text-brand-primary',
			'uppercase'
		]}
	>
		{eyebrow}
	</p>
{/if}
<h2
	{id}
	class={[
		'm-0',
		styleClass,
		'text-3xl leading-[1.1] font-bold tracking-tight text-balance',
		onNavy ? 'text-white' : 'text-primary',
		'md:text-[2.75rem]'
	]}
	{@attach reveal}
>
	{title}
</h2>
{#if description !== undefined}
	<p
		class={['m-0 text-lg leading-relaxed text-pretty', onNavy ? 'text-white/78' : 'text-secondary']}
	>
		{description}
	</p>
{/if}
