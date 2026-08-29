import { HttpStatus } from '@nestjs/common';

/**
 * Erro de regra de negócio. Serviços lançam isto; o ProblemDetailsFilter
 * converte para application/problem+json. Nunca importar HTTP nos serviços.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    readonly title: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static notFound(resource = 'Recurso'): DomainError {
    return new DomainError(
      'not-found',
      'Não encontrado',
      HttpStatus.NOT_FOUND,
      `${resource} não encontrado.`,
    );
  }

  static forbidden(message = 'Você não tem permissão para esta ação.'): DomainError {
    return new DomainError('forbidden', 'Acesso negado', HttpStatus.FORBIDDEN, message);
  }

  static unauthorized(message = 'Credenciais inválidas ou ausentes.'): DomainError {
    return new DomainError('unauthorized', 'Não autenticado', HttpStatus.UNAUTHORIZED, message);
  }

  static conflict(message: string): DomainError {
    return new DomainError('conflict', 'Conflito de estado', HttpStatus.CONFLICT, message);
  }

  static validation(message: string): DomainError {
    return new DomainError(
      'validation',
      'Requisição inválida',
      HttpStatus.UNPROCESSABLE_ENTITY,
      message,
    );
  }

  static planLimit(message: string): DomainError {
    return new DomainError(
      'plan-limit',
      'Limite do plano atingido',
      HttpStatus.PAYMENT_REQUIRED,
      message,
    );
  }

  static tenantInactive(message = 'A empresa está suspensa ou cancelada.'): DomainError {
    return new DomainError('tenant-inactive', 'Empresa inativa', HttpStatus.FORBIDDEN, message);
  }
}
