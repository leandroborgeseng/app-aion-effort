// src/utils/validation.ts
// Utilitários de validação e sanitização

import { ValidationError } from './errorHandler';

/**
 * Valida se um valor é um número válido
 */
export function validateNumber(value: any, fieldName: string, min?: number, max?: number): number {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} é obrigatório`);
  }

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} deve ser um número válido`);
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} deve ser maior ou igual a ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} deve ser menor ou igual a ${max}`);
  }

  return num;
}

/**
 * Valida se uma string não está vazia
 */
export function validateString(value: any, fieldName: string, minLength?: number, maxLength?: number): string {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} deve ser uma string válida`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} não pode estar vazio`);
  }

  if (minLength !== undefined && trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} deve ter pelo menos ${minLength} caracteres`);
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} deve ter no máximo ${maxLength} caracteres`);
  }

  return trimmed;
}

/**
 * Valida se um valor é um email válido
 */
export function validateEmail(value: any, fieldName: string = 'Email'): string {
  const email = validateString(value, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(`${fieldName} deve ser um email válido`);
  }

  return email.toLowerCase();
}

/**
 * Valida se uma data é válida
 */
export function validateDate(value: any, fieldName: string): Date {
  if (!value) {
    throw new ValidationError(`${fieldName} é obrigatório`);
  }

  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} deve ser uma data válida`);
  }

  return date;
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '') // Remove < e >
    .trim();
}

/**
 * Sanitiza objeto removendo propriedades undefined/null
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const sanitized: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
}

/**
 * Valida ID (string ou número)
 */
export function validateId(value: any, fieldName: string = 'ID'): string {
  if (!value) {
    throw new ValidationError(`${fieldName} é obrigatório`);
  }

  const id = String(value).trim();
  if (id.length === 0) {
    throw new ValidationError(`${fieldName} não pode estar vazio`);
  }

  return id;
}

