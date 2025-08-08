import * as analytics from '$lib/services/analytics.services';
import * as storageUtils from '$lib/utils/storage.utils';
import { authLocked } from '$lib/utils/locked.utils';
import type { MockInstance } from 'vitest';

describe('authLocked store', () => {
  let spyTrackEvent: MockInstance;
  let spyStorageSet: MockInstance;
  let spyStorageGet: MockInstance;

  beforeEach(() => {
    vi.resetAllMocks();
    spyTrackEvent = vi.spyOn(analytics, 'trackEvent');
    spyStorageSet = vi.spyOn(storageUtils, 'set');
    spyStorageGet = vi.spyOn(storageUtils, 'get').mockReturnValue(undefined);
  });


  describe('toggleLock', () => {

    it('should toggle from false to true', () => {
      spyStorageGet.mockReturnValueOnce(false);
      
      authLocked.toggleLock({ source: 'toggle-test' });

      expect(spyStorageSet).toHaveBeenCalledWith({
        key: 'authLocked',
        value: true
      });
    });

    it('should toggle from true to false', () => {
      spyStorageGet.mockReturnValueOnce(true);
      
      authLocked.toggleLock({ source: 'toggle-test' });

      expect(spyStorageSet).toHaveBeenCalledWith({
        key: 'authLocked',
        value: false
      });
    });
  });

  describe('persistence', () => {

    it('should use default false when no stored value', () => {
      spyStorageGet.mockReturnValueOnce(undefined);
      const store = authLocked;
      
      let currentValue: boolean | undefined;
      const unsubscribe = store.subscribe(v => currentValue = v);
      unsubscribe();
      
      expect(currentValue).toBe(false);
    });
  });
});