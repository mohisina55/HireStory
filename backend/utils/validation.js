// utils/validation.js
const validator = require('validator');

// Email validation
const validateEmail = (email) => {
  if (!email || !validator.isEmail(email)) {
    return { isValid: false, message: 'Please provide a valid email address' };
  }
  return { isValid: true };
};

// Password validation
const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  // Check for at least one number and one special character
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasNumber || !hasSpecialChar) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one number and one special character' 
    };
  }
  
  return { isValid: true };
};

// Role validation
const validateRole = (role) => {
  const validRoles = ['Student', 'Professional', 'Recruiter'];
  if (!role || !validRoles.includes(role)) {
    return { 
      isValid: false, 
      message: 'Role must be one of: Student, Professional, Recruiter' 
    };
  }
  return { isValid: true };
};

// Experience validation
const validateExperience = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!data.company || data.company.trim().length < 2) {
    errors.push('Company name must be at least 2 characters long');
  }
  
  if (!data.role || data.role.trim().length < 2) {
    errors.push('Role must be at least 2 characters long');
  }
  
  const validDifficulties = ['Easy', 'Medium', 'Hard'];
  if (!data.difficulty || !validDifficulties.includes(data.difficulty)) {
    errors.push('Difficulty must be Easy, Medium, or Hard');
  }
  
  if (!data.experienceText || data.experienceText.trim().length < 50) {
    errors.push('Experience text must be at least 50 characters long');
  }
  
  if (data.experienceText && data.experienceText.length > 5000) {
    errors.push('Experience text must not exceed 5000 characters');
  }
  
  // Validate email if provided
  if (data.email && !validator.isEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Validate URLs in resources
  if (data.resources && Array.isArray(data.resources)) {
    data.resources.forEach((resource, index) => {
      if (resource && !validator.isURL(resource, { protocols: ['http', 'https'] })) {
        errors.push(`Resource ${index + 1} must be a valid URL`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Sanitize input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

// Sanitize experience data
const sanitizeExperienceData = (data) => {
  return {
    name: sanitizeInput(data.name),
    email: data.email ? sanitizeInput(data.email) : '',
    company: sanitizeInput(data.company),
    role: sanitizeInput(data.role),
    difficulty: data.difficulty,
    experienceText: sanitizeInput(data.experienceText),
    tags: Array.isArray(data.tags) ? data.tags.map(tag => sanitizeInput(tag)) : [],
    resources: Array.isArray(data.resources) ? data.resources.filter(r => r.trim()) : []
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRole,
  validateExperience,
  sanitizeInput,
  sanitizeExperienceData
};