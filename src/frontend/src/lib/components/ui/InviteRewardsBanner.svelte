<script lang="ts">
	import IconRight from '../icons/lucide/IconRight.svelte';
	import Sprinkles from '../sprinkles/Sprinkles.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<a
	href="https://docs.oisy.com/rewards/oisy-sprinkles"
	target="_blank"
	rel="noopener noreferrer"
	class="invite-rewards-banner"
>
	<div class="banner-content">
		<!-- Sprinkles Animation -->
		<Sprinkles type="box" />
		
		<!-- Sprinkles Icon -->
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><g clip-path="url(#a)"><path fill="url(#b)" d="M7.5 14.748c.707 0 1.28.785 1.28 1.752s-.573 1.752-1.28 1.752c-.704 0-1.28-.785-1.28-1.752s.576-1.752 1.28-1.752Z"/><path fill="url(#c)" fill-rule="evenodd" d="M9.382 14.514C8.978 13.96 8.325 13.5 7.5 13.5s-1.477.462-1.88 1.013C5.215 15.065 5 15.772 5 16.5c0 .729.216 1.435.62 1.987.403.551 1.055 1.013 1.88 1.013s1.478-.46 1.882-1.014c.404-.553.618-1.259.618-1.986 0-.727-.214-1.433-.618-1.986ZM8.78 16.5c0-.967-.573-1.752-1.28-1.752-.704 0-1.28.785-1.28 1.752s.576 1.752 1.28 1.752c.707 0 1.28-.785 1.28-1.752Z" clip-rule="evenodd"/><path fill="url(#d)" d="M18.42 7.964c.387-.673 1.432-.799 2.332-.28.9.519 1.315 1.485.927 2.158-.386.67-1.432.799-2.332.28-.9-.518-1.314-1.488-.928-2.158Z"/><path fill="url(#e)" fill-rule="evenodd" d="M19.233 6.046c-.736.088-1.523.463-1.976 1.249-.452.785-.38 1.654-.088 2.334.292.68.83 1.265 1.509 1.655.678.39 1.453.564 2.189.475.734-.089 1.522-.462 1.974-1.247.453-.786.382-1.655.09-2.336-.294-.682-.834-1.264-1.51-1.654-.677-.39-1.451-.564-2.188-.476Zm1.519 1.638c-.9-.519-1.945-.393-2.333.28-.386.67.028 1.64.928 2.158.9.519 1.946.39 2.332-.28.388-.673-.027-1.64-.927-2.158Z" clip-rule="evenodd"/><path fill="url(#f)" d="M10.106 10.23c-.705.644-1.573.586-1.943-.133-.367-.717-.093-1.822.612-2.467l5.102-4.682c.705-.645 1.575-.586 1.941.129.371.72.097 1.826-.609 2.471l-5.103 4.681Z"/><path fill="url(#g)" d="M19.752 19.39c.588.41 1.308.114 1.609-.657.3-.773.07-1.73-.518-2.138l-4.248-2.964c-.586-.407-1.304-.115-1.605.658-.301.774-.071 1.73.514 2.139l4.248 2.963Z"/><path fill="url(#h)" fill-rule="evenodd" d="M6.051 5a2.662 2.662 0 0 0 .509-1.59c0-.584-.176-1.15-.508-1.592-.33-.441-.865-.811-1.541-.811-.677 0-1.212.369-1.543.812a2.663 2.663 0 0 0-.507 1.59c0 .583.176 1.149.507 1.592.331.443.866.812 1.543.812.676 0 1.21-.37 1.541-.811Z" clip-rule="evenodd"/></g><defs><radialGradient id="b" cx="0" cy="0" r="1" gradientTransform="matrix(3.75 -3.42857 3.7604 4.11294 6.25 15.214)" gradientUnits="userSpaceOnUse"><stop stop-color="#489CFF"/><stop offset="1" stop-color="#06F"/></radialGradient><radialGradient id="c" cx="0" cy="0" r="1" gradientTransform="matrix(3.75 -3.42857 3.7604 4.11294 6.25 15.214)" gradientUnits="userSpaceOnUse"><stop stop-color="#489CFF"/><stop offset="1" stop-color="#06F"/></radialGradient><radialGradient id="d" cx="0" cy="0" r="1" gradientTransform="rotate(-101.833 12.903 -2.675) scale(5.52697 6.0478)" gradientUnits="userSpaceOnUse"><stop stop-color="#C448FF"/><stop offset="1" stop-color="#B200F0"/></radialGradient><radialGradient id="e" cx="0" cy="0" r="1" gradientTransform="rotate(-101.833 12.903 -2.675) scale(5.52697 6.0478)" gradientUnits="userSpaceOnUse"><stop stop-color="#C448FF"/><stop offset="1" stop-color="#B200F0"/></radialGradient><radialGradient id="f" cx="0" cy="0" r="1" gradientTransform="matrix(11.61964 -10.90012 11.97857 12.76928 10.873 6.95)" gradientUnits="userSpaceOnUse"><stop stop-color="#FF8A48"/><stop offset="1" stop-color="#FF5C00"/></radialGradient><radialGradient id="g" cx="0" cy="0" r="1" gradientTransform="matrix(11.61964 -10.90012 11.97857 12.76928 10.873 6.95)" gradientUnits="userSpaceOnUse"><stop stop-color="#FF8A48"/><stop offset="1" stop-color="#FF5C00"/></radialGradient><radialGradient id="h" cx="0" cy="0" r="1" gradientTransform="matrix(3.07417 -2.74653 3.00535 3.36386 3.485 2.38)" gradientUnits="userSpaceOnUse"><stop stop-color="#489CFF"/><stop offset="1" stop-color="#06F"/></radialGradient><clipPath id="a"><path fill="#fff" d="M0 0h24v24H0z"/></clipPath></defs></svg>

		<span class="banner-text text-base text-primary">{$i18n.rewards.text.banner_text}</span>
		<IconRight size="20" />
	</div>
</a>

<style lang="scss">
	.invite-rewards-banner {
		position: relative;
		border-radius: 1.5rem;
		border: 1px solid var(--color-background-secondary-alt);
		background: var(--color-background-primary);
		cursor: pointer;
		transition: transform 0.2s ease;
		width: fit-content;
		max-width: 100%;
		text-decoration: none;
		display: block;
		overflow: hidden; /* Contain the confetti within the banner */
	}

	.invite-rewards-banner:hover {
		transform: scale(1.02);
		text-decoration: none;
        color: var(--color-foreground-brand-primary-alt);
	}

	.invite-rewards-banner:hover .banner-text {
		color: var(--color-brand-primary-alt);
		transition: color 0.2s ease;
	}

	.banner-content {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem; 
		padding: 0.25rem 0.5rem;
		border-radius: 1.5rem;
		white-space: nowrap;
		z-index: 1; /* Ensure content is above confetti */
	}

	.banner-text {
		transition: color 0.2s ease;
	}

	/* Responsive text */
	@media (max-width: 640px) {
		.banner-content {
			font-size: var(--font-size-sm);
		}
	}
</style> 