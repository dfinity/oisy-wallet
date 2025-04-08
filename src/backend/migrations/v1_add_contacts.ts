import { UserProfile } from '../declarations/backend/backend.did';
import { Migration } from './migration.types';

/**
 * Migration to add contacts support to user profiles
 * 
 * This migration adds the following fields to the user profile:
 * - contacts: An array of contact objects
 * - contact_groups: An array of contact group objects
 */
export const migration: Migration = {
  name: 'v1_add_contacts',
  
  // Check if the migration is needed
  shouldApply: (profile: UserProfile): boolean => {
    // If the profile doesn't have contacts field, we need to apply the migration
    return !('contacts' in profile);
  },
  
  // Apply the migration
  apply: (profile: UserProfile): UserProfile => {
    // Create a new profile with the contacts fields
    return {
      ...profile,
      contacts: [],
      contact_groups: [],
    };
  }
};