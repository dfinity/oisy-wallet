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
	{src}
	{role}
	{alt}
	{loading}
	{width}
	{height}
	data-tid={testId}
	decoding="async"
	onload={onLoad}
	onerror={onError}
	class:rounded-full={rounded}
	class:grayscale
	class={styleClass}
	style={fitHeight ? `max-width: inherit; height: ${height};` : undefined}
/>
