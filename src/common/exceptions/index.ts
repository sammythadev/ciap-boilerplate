// Base exception
export { BaseException } from '@bases/base.exception';

// Auth exceptions
export {
  InvalidCredentialsException,
  TokenExpiredException,
  InvalidTokenException,
  InsufficientPermissionsException,
  AccountLockedException,
  AccountDisabledException,
} from './auth.exceptions';

// User exceptions
export {
  UserNotFoundException,
  DuplicateEmailException,
  InvalidUserDataException,
  IncompleteUserProfileException,
  UnauthorizedUserActionException,
  UserLimitExceededException,
} from './user.exceptions';

// Database exceptions
export {
  DatabaseException,
  DatabaseConnectionException,
  TransactionFailedException,
  ConstraintViolationException,
  QueryTimeoutException,
  DatabaseLockedException,
} from './database.exceptions';

// Validation exceptions
export {
  ValidationException,
  InvalidEmailException,
  WeakPasswordException,
  MissingFieldException,
  InvalidRangeException,
  InvalidLengthException,
  InvalidEnumException,
} from './validation.exceptions';

// External exceptions
export {
  ExternalApiException,
  ExternalApiTimeoutException,
  ExternalApiResponseException,
  EmailSendingException,
  FileUploadException,
  IntegrationException,
  RateLimitExceededException,
} from './external.exceptions';
