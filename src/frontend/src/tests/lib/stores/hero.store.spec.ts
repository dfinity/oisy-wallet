import { initHeroContext } from '$lib/stores/hero.store';
import { get } from 'svelte/store';

describe('hero.store', () => {
	describe('initHeroContext', () => {
		it('should return a hero context with loading, loaded, and outflowActionsDisabled', () => {
			const heroContext = initHeroContext();

			expect(heroContext).toHaveProperty('loading');
			expect(heroContext).toHaveProperty('loaded');
			expect(heroContext).toHaveProperty('outflowActionsDisabled');
		});

		describe('loading', () => {
			const { loading } = initHeroContext();

			it('should be a writable store', () => {
				expect(loading).toHaveProperty('set');
				expect(loading).toHaveProperty('update');
				expect(loading).toHaveProperty('subscribe');
			});

			it('should be initialized to true', () => {
				expect(get(loading)).toBeTruthy();
			});
		});

		describe('loaded', () => {
			const { loaded } = initHeroContext();

			it('should be a readable store', () => {
				expect(loaded).toHaveProperty('subscribe');
				expect(loaded).not.toHaveProperty('set');
				expect(loaded).not.toHaveProperty('update');
			});

			it('should be initialized to false', () => {
				expect(get(loaded)).toBeFalsy();
			});

			it('should be the opposite of loading', () => {
				const { loading, loaded } = initHeroContext();

				expect(get(loading)).toBeTruthy();
				expect(get(loaded)).toBeFalsy();

				loading.set(false);

				expect(get(loading)).toBeFalsy();
				expect(get(loaded)).toBeTruthy();

				loading.set(true);

				expect(get(loading)).toBeTruthy();
				expect(get(loaded)).toBeFalsy();
			});
		});

		describe('outflowActionsDisabled', () => {
			const { outflowActionsDisabled } = initHeroContext();

			it('should be a writable store', () => {
				expect(outflowActionsDisabled).toHaveProperty('set');
				expect(outflowActionsDisabled).toHaveProperty('update');
				expect(outflowActionsDisabled).toHaveProperty('subscribe');
			});

			it('should be initialized to true', () => {
				expect(get(outflowActionsDisabled)).toBeTruthy();
			});
		});
	});
});
