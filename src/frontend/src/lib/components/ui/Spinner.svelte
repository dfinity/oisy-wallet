<script lang="ts">
	interface Props {
		size?: string;
		inline?: boolean;
	}

	const { size = '16px', inline = false }: Props = $props();
</script>

<span style="--spinner-size: {size}" class="relative flex" class:inline>
	<svg
		class="spinner"
		aria-hidden="true"
		data-tid="spinner"
		fill="none"
		focusable="false"
		preserveAspectRatio="xMidYMid meet"
		stroke="currentColor"
		stroke-linejoin="round"
		stroke-width="3.2"
		viewBox="0 0 46 40"
	>
		<!-- OISY's smooth helmet glass, without the outer helmet tabs or face. -->
		<path
			d="M41.9679 20.9668V19.3807C42.1127 8.8544 33.3268 6.93179 22.996 6.7876C12.617 6.93179 3.83106 8.8544 3.97589 19.3807V20.9668C3.83106 31.5412 12.617 33.4638 22.996 33.608C33.3268 33.4638 42.1127 31.5412 41.9679 20.9668Z"
			opacity="0.2"
			pathLength="100"
		/>
		<path
			class="trace"
			d="M41.9679 20.9668V19.3807C42.1127 8.8544 33.3268 6.93179 22.996 6.7876C12.617 6.93179 3.83106 8.8544 3.97589 19.3807V20.9668C3.83106 31.5412 12.617 33.4638 22.996 33.608C33.3268 33.4638 42.1127 31.5412 41.9679 20.9668Z"
			pathLength="100"
			stroke-dasharray="25 75"
			stroke-linecap="round"
		/>
	</svg>
</span>

<style lang="scss">
	.inline {
		display: inline-flex;
		flex-shrink: 0;
		width: var(--spinner-size);
		height: var(--spinner-size);
		vertical-align: middle;

		.spinner {
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
		}
	}

	.spinner {
		color: inherit;
		width: var(--spinner-size);
		height: var(--spinner-size);
		position: absolute;
		top: calc(50% - (var(--spinner-size) / 2));
		left: calc(50% - (var(--spinner-size) / 2));
	}

	.trace {
		animation: spinner-trace 1200ms linear infinite;
	}

	@keyframes spinner-trace {
		to {
			stroke-dashoffset: -100;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.trace {
			animation: none;
			stroke-dasharray: none;
		}
	}
</style>
