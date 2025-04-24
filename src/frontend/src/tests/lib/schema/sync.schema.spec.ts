import { SyncStateSchema } from '$lib/schema/sync.schema';

describe('sync.schema', () => {
	it('should validate correct enum values', () => {
		expect(SyncStateSchema.safeParse('idle').success).toBeTruthy();
		expect(SyncStateSchema.safeParse('in_progress').success).toBeTruthy();
		expect(SyncStateSchema.safeParse('error').success).toBeTruthy();
	});

	it('should reject incorrect values', () => {
		expect(SyncStateSchema.safeParse('completed').success).toBeFalsy();
		expect(SyncStateSchema.safeParse('not_started').success).toBeFalsy();
		expect(SyncStateSchema.safeParse(123).success).toBeFalsy();
		expect(SyncStateSchema.safeParse(null).success).toBeFalsy();
		expect(SyncStateSchema.safeParse(undefined).success).toBeFalsy();
	});
});
