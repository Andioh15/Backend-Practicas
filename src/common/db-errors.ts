import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * Traduce errores de Postgres a respuestas HTTP legibles para el panel admin.
 * - 23503 (foreign_key_violation): el registro está en uso o la referencia no existe.
 * - 23505 (unique_violation): ya existe un registro con esa clave.
 */
export function rethrowDbError(error: unknown, entity: string): never {
  const code = (error as { code?: string })?.code;
  const detail = (error as { detail?: string })?.detail ?? '';

  if (code === '23503') {
    if (detail.includes('is still referenced')) {
      throw new ConflictException(`No se puede eliminar: ${entity} está en uso por otros registros. Elimina o reasigna primero los registros que dependen de él.`);
    }
    throw new BadRequestException(`La referencia indicada para ${entity} no existe.`);
  }
  if (code === '23505') {
    throw new ConflictException(`Ya existe ${entity} con ese identificador.`);
  }
  throw error;
}
