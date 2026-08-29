import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Uso: @Body(new ZodBody(loginBody)) body: LoginBody
 * Erros de validação viram problem+json 422 pelo ProblemDetailsFilter.
 */
@Injectable()
export class ZodBody<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}

export class ZodQuery<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}
