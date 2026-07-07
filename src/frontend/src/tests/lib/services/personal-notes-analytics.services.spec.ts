import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import {
	trackPersonalNote,
	type PersonalNoteStep
} from '$lib/services/personal-notes-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('personal-notes-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackPersonalNote', () => {
		it('tracks a successful create with context, modifier, source and status', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'success'
				}
			});
		});

		it('adds event_value first_note only on the first successful create', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				isFirstNote: true
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'success',
					event_value: 'first_note'
				}
			});
		});

		it('omits first_note when isFirstNote is false', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				isFirstNote: false
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'success'
				}
			});
		});

		it.each<PersonalNoteStep>(['edit', 'delete', 'open', 'view'])(
			'maps the %s step onto event_modifier',
			(step) => {
				trackPersonalNote({ step, resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS });

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: 'personal_note',
					metadata: {
						event_context: 'personal_notes',
						event_modifier: step,
						source_location: 'notes',
						result_status: 'success'
					}
				});
			}
		);

		it('carries a sanitized error string on failure', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				error: 'save failed'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'error',
					result_error: 'save failed'
				}
			});
		});

		it('omits an empty error string', () => {
			trackPersonalNote({
				step: 'delete',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				error: ''
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'delete',
					source_location: 'notes',
					result_status: 'error'
				}
			});
		});

		it('never emits the note text, a note id, or any key beyond the fixed schema', () => {
			trackPersonalNote({
				step: 'edit',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				isFirstNote: true,
				error: 'boom'
			});

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

			// Even the maximal payload stays within the fixed schema — nothing
			// note-specific (content, id, token, key) can appear.
			expect(Object.keys(metadata ?? {}).sort()).toEqual(
				[
					'event_context',
					'event_modifier',
					'event_value',
					'result_error',
					'result_status',
					'source_location'
				].sort()
			);
		});
	});
});
