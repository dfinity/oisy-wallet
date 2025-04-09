import type { ContactError } from '$declarations/backend/backend.did';

export class ContactOperationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ContactOperationError';
  }
}

export const mapContactError = (error: ContactError): ContactOperationError => {
  if ('VersionMismatch' in error) {
    return new ContactOperationError(
      'VERSION_MISMATCH',
      'The operation could not be completed because the user profile has been updated. Please refresh and try again.'
    );
  }

  if ('UserNotFound' in error) {
    return new ContactOperationError(
      'USER_NOT_FOUND',
      'User profile not found. Please create a profile first.'
    );
  }

  if ('ContactAlreadyExists' in error) {
    return new ContactOperationError(
      'CONTACT_ALREADY_EXISTS',
      'A contact with this address and network already exists.'
    );
  }

  if ('ContactNotFound' in error) {
    return new ContactOperationError(
      'CONTACT_NOT_FOUND',
      'The specified contact could not be found.'
    );
  }

  if ('GroupAlreadyExists' in error) {
    return new ContactOperationError(
      'GROUP_ALREADY_EXISTS',
      'A contact group with this name already exists.'
    );
  }

  if ('GroupNotFound' in error) {
    return new ContactOperationError(
      'GROUP_NOT_FOUND',
      'The specified contact group could not be found.'
    );
  }

  if ('GroupInUse' in error) {
    return new ContactOperationError(
      'GROUP_IN_USE',
      'This contact group cannot be deleted because it is still being used by one or more contacts.'
    );
  }

  return new ContactOperationError(
    'UNKNOWN_ERROR',
    'An unknown error occurred while performing the contact operation.'
  );
};