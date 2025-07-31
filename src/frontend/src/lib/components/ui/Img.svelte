<script lang="ts">
	interface Props {
		src: string;
		alt?: string;
		role?: string;
		loading?: 'eager' | 'lazy';
		width?: string;
		height?: string;
		rounded?: boolean;
		fitHeight?: boolean;
		grayscale?: boolean;
		styleClass?: string;
		testId?: string;
		onLoad?: () => void;
		onError?: () => void;
	}

	let {
		src,
		alt = '',
		role = 'presentation',
		loading = 'lazy',
		width,
		height,
		rounded = false,
		fitHeight = false,
		grayscale = false,
		styleClass,
		testId,
		onLoad,
		onError
	}: Props = $props();
</script>

<img
	style={fitHeight ? `max-width: inherit; height: ${height};` : undefined}
	class={styleClass}
	class:grayscale
	class:rounded-full={rounded}
	{alt}
	data-tid={testId}
	decoding="async"
	{height}
	{loading}
	onerror={onError}
	onload={onLoad}
	{role}
	{src}
	{width}
/>
