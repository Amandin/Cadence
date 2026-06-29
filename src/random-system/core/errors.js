export class RandomSystemError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RandomSystemError';
    this.code = code;
    this.details = details;
  }
}
