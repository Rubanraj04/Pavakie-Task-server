/**
 * Validation utilities for authentication
 */

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Minimum 6 characters
  return password && password.length >= 6;
};

const validateUserInput = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || !validatePassword(data.password)) {
    errors.push('Password must be at least 6 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateUserInput,
};

