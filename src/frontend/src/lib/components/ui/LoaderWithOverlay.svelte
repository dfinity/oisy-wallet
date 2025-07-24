<div class="avatar-spinner-overlay" role="status" aria-label="Uploading image">
	<svg
		id="app-spinner"
		preserveAspectRatio="xMidYMid meet"
		focusable="false"
		aria-hidden="true"
		data-tid="spinner"
		viewBox="0 0 100 100"
	>
		<circle cx="50%" cy="50%" r="45" />
	</svg>
</div>

<style>
	.avatar-spinner-overlay {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.4);
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
