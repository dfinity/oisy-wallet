import type { PersonalNoteEntryUi } from '$lib/types/personal-note';
import {
	comparePersonalNotesByUpdatedDesc,
	generatePersonalNoteId,
	personalNoteLength
} from '$lib/utils/personal-note.utils';

describe('personal-note.utils', () => {
	describe('generatePersonalNoteId', () => {
		it('produces a 32-character dash-less id (fits the 32-byte map key)', () => {
			const id = generatePersonalNoteId();

			expect(id).toHaveLength(32);
			expect(id).not.toContain('-');
			expect(new TextEncoder().encode(id).length).toBeLessThanOrEqual(32);
		});

		it('produces distinct ids', () => {
			expect(generatePersonalNoteId()).not.toBe(generatePersonalNoteId());
		});
	});

	describe('personalNoteLength', () => {
		it('counts ASCII by character', () => {
			expect(personalNoteLength('hello')).toBe(5);
		});

		it('counts emoji and astral characters as single code points, not UTF-16 units', () => {
			// "😀" and "𝔘" are each a single code point but two UTF-16 units.
			expect(personalNoteLength('😀')).toBe(1);
			expect(personalNoteLength('a😀b')).toBe(3);
			expect('😀').toHaveLength(2); // sanity: UTF-16 length would over-count
		});
	});

	describe('comparePersonalNotesByUpdatedDesc', () => {
		const note = ({ id, updated }: { id: string; updated: string }): PersonalNoteEntryUi => ({
			id,
			note: id,
			created_at_ns: updated,
			updated_at_ns: updated
		});

		it('sorts newest-first by updated_at_ns', () => {
			const sorted = [
				note({ id: 'a', updated: '100' }),
				note({ id: 'c', updated: '300' }),
				note({ id: 'b', updated: '200' })
			].sort((a, b) => comparePersonalNotesByUpdatedDesc({ a, b }));

			expect(sorted.map(({ id }) => id)).toEqual(['c', 'b', 'a']);
		});

		it('keeps decryption-failure entries at the bottom', () => {
			const sorted = [
				{ id: 'broken', decryptionFailed: true } as PersonalNoteEntryUi,
				note({ id: 'a', updated: '100' })
			].sort((a, b) => comparePersonalNotesByUpdatedDesc({ a, b }));

			expect(sorted.map(({ id }) => id)).toEqual(['a', 'broken']);
		});
	});
});
