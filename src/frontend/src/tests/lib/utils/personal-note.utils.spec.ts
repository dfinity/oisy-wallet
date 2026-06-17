import { NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import type { PersonalNoteEntryUi } from '$lib/types/personal-note';
import {
	comparePersonalNotesByUpdatedDesc,
	formatPersonalNoteTimestamp,
	generatePersonalNoteId,
	neutralizePersonalNoteText,
	personalNoteLength,
	personalNotePreview
} from '$lib/utils/personal-note.utils';

const nsFrom = (date: Date): string =>
	(BigInt(date.getTime()) * NANO_SECONDS_IN_MILLISECOND).toString();

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

	describe('neutralizePersonalNoteText', () => {
		it('strips bidi/control formatting characters', () => {
			// U+202E RLO + U+2066 LRI + U+200F RLM around otherwise plain text.
			const spoofed = '\u202Eevil\u2066text\u200F';

			const result = neutralizePersonalNoteText(spoofed);

			expect(result).toBe('eviltext');
			expect(result).not.toMatch(/[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/u);
		});

		it('leaves ordinary Unicode (including emoji / CJK) untouched', () => {
			expect(neutralizePersonalNoteText('héllo 世界 😀')).toBe('héllo 世界 😀');
		});
	});

	describe('personalNotePreview', () => {
		it('collapses line breaks and whitespace runs to a single space', () => {
			expect(personalNotePreview('line one\n\n  line\ttwo  ')).toBe('line one line two');
		});

		it('neutralizes bidi characters in the preview', () => {
			expect(personalNotePreview('a\u202Eb')).toBe('ab');
		});
	});

	describe('formatPersonalNoteTimestamp', () => {
		const currentDate = new Date('2026-06-17T12:00:00Z');

		it('renders a relative time for recent notes', () => {
			const fiveMinutesAgo = new Date(currentDate.getTime() - 5 * 60 * 1000);

			expect(formatPersonalNoteTimestamp({ ns: nsFrom(fiveMinutesAgo), currentDate })).toContain(
				'ago'
			);
		});

		it('renders an absolute date for older notes', () => {
			const tenDaysAgo = new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000);

			const result = formatPersonalNoteTimestamp({ ns: nsFrom(tenDaysAgo), currentDate });

			expect(result).not.toContain('ago');
			expect(result).toMatch(/\d/);
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
