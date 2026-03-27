import Hr from '$lib/components/ui/Hr.svelte';
import { componentToHtml } from '$lib/utils/component.utils';
import type { Component } from 'svelte';

describe('component.utils', () => {
	it('renders Hr with default spacing (none)', () => {
		const html = componentToHtml({ Component: Hr });

		expect(html).toContain('<hr');
		expect(html).toContain('bg-brand-subtle-10');
		expect(html).not.toContain('my-4');
		expect(html).not.toContain('my-6');
	});

	it('renders passed component with props', () => {
		const html = componentToHtml({
			Component: Hr,
			props: { spacing: 'md' }
		});

		expect(html).toContain('my-4');
		expect(html).not.toContain('my-6');
	});

	it('renders passed component with different props', () => {
		const html = componentToHtml({
			Component: Hr,
			props: { spacing: 'lg' }
		});

		expect(html).toContain('my-6');
		expect(html).not.toContain('my-4');
	});

	it('returns empty string if component fails to mount', () => {
		const BadComponent = {} as unknown as Component;
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const html = componentToHtml({ Component: BadComponent });

		expect(html).toBe('');
		expect(consoleSpy).toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it('cleans up container after rendering', () => {
		const removeSpy = vi.spyOn(HTMLElement.prototype, 'remove');

		componentToHtml({ Component: Hr, props: { spacing: 'md' } });

		expect(removeSpy).toHaveBeenCalled();

		removeSpy.mockRestore();
	});
});
