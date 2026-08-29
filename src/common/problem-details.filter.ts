import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { DomainError } from './domain-error';
import { TenantContext } from '../iam/tenant-context/tenant-context';

interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: { path: string; message: string }[];
}

const BASE = 'https://errors.coldchain.app';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const traceId = TenantContext.get()?.requestId;

    const problem = this.toProblem(exception, req.url, traceId);

    if (problem.status >= 500) {
      this.logger.error({ err: exception, traceId, path: req.url }, 'Erro não tratado');
    } else {
      this.logger.warn({ traceId, path: req.url, status: problem.status }, problem.title);
    }

    res.status(problem.status).type('application/problem+json').send(problem);
  }

  private toProblem(exception: unknown, instance: string, traceId?: string): Problem {
    if (exception instanceof ZodError) {
      return {
        type: `${BASE}/validation`,
        title: 'Requisição inválida',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'Um ou mais campos não passaram na validação.',
        instance,
        traceId,
        errors: exception.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      };
    }

    if (exception instanceof DomainError) {
      return {
        type: `${BASE}/${exception.code}`,
        title: exception.title,
        status: exception.status,
        detail: exception.message,
        instance,
        traceId,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const detail =
        typeof payload === 'string'
          ? payload
          : (((payload as Record<string, unknown>).message as string) ?? exception.message);
      return {
        type: `${BASE}/http-${status}`,
        title: HttpStatus[status] ?? 'Erro',
        status,
        detail: Array.isArray(detail) ? detail.join('; ') : detail,
        instance,
        traceId,
      };
    }

    return {
      type: `${BASE}/internal`,
      title: 'Erro interno',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Ocorreu um erro inesperado. Contate o suporte com o traceId.',
      instance,
      traceId,
    };
  }
}
