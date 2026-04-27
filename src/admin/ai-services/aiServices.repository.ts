import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../services/database/database.service';
import { SearchAiServicesDto } from './dto/searchAiServices.dto';
import { CreateAiServiceDto } from './dto/createAiService.dto';
import { UpdateAiServiceDto } from './dto/updateAiService.dto';

@Injectable()
export class AiServicesRepository {
  constructor(private readonly db: DatabaseService) {}

  private buildWhere(dto: SearchAiServicesDto) {
    const clauses: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (dto.search) {
      values.push(`%${dto.search}%`);
      clauses.push(
        `(s.name ILIKE $${index} OR s.type ILIKE $${index} OR COALESCE(s.description, '') ILIKE $${index})`,
      );
      index++;
    }

    if (dto.type) {
      values.push(dto.type);
      clauses.push(`s.type = $${index}`);
      index++;
    }

    if (dto.status) {
      values.push(dto.status);
      clauses.push(`s.status = $${index}`);
      index++;
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return { whereSql, values, nextIndex: index };
  }

  async findMany(dto: SearchAiServicesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const offset = (page - 1) * limit;

    const { whereSql, values, nextIndex } = this.buildWhere(dto);

    const items = await this.db.query(`
      SELECT
        s.id,
        s.name,
        s.type,
        s.description,
        s.default_config AS "defaultConfig",
        s.status,
        s.created_at AS "createdAt",
        s.updated_at AS "updatedAt",
        (
          SELECT COUNT(*)::int
          FROM partner_services ps
          WHERE ps.service_id = s.id
        ) AS "deploymentCount",
        (
          SELECT COUNT(DISTINCT ps.partner_id)::int
          FROM partner_services ps
          WHERE ps.service_id = s.id
        ) AS "partnerCount"
      FROM services s
      ${whereSql}
      ORDER BY s.created_at DESC
      LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
    `, [...values, limit, offset]);

    const totalRow = await this.db.queryOne<{ total: number }>(`
      SELECT COUNT(*)::int AS total
      FROM services s
      ${whereSql}
    `, values);

    return {
      items,
      pagination: {
        page,
        limit,
        total: totalRow?.total ?? 0,
        totalPages: Math.ceil((totalRow?.total ?? 0) / limit),
      },
    };
  }

  async findById(id: string) {
    return await this.db.queryOne(`
      SELECT
        s.id,
        s.name,
        s.type,
        s.description,
        s.default_config AS "defaultConfig",
        s.status,
        s.created_at AS "createdAt",
        s.updated_at AS "updatedAt",
        (
          SELECT COUNT(*)::int
          FROM partner_services ps
          WHERE ps.service_id = s.id
        ) AS "deploymentCount",
        (
          SELECT COUNT(DISTINCT ps.partner_id)::int
          FROM partner_services ps
          WHERE ps.service_id = s.id
        ) AS "partnerCount",
        (
          SELECT COALESCE(SUM(ps.token_used), 0)::int
          FROM partner_services ps
          WHERE ps.service_id = s.id
        ) AS "totalTokenUsed"
      FROM services s
      WHERE s.id = $1
    `, [id]);
  }

  async findDuplicate(name: string, type: string, excludeId?: string) {
    if (excludeId) {
      return await this.db.queryOne<{ id: string }>(`
        SELECT id
        FROM services
        WHERE LOWER(name) = LOWER($1)
          AND LOWER(type) = LOWER($2)
          AND id <> $3
        LIMIT 1
      `, [name, type, excludeId]);
    }

    return await this.db.queryOne<{ id: string }>(`
      SELECT id
      FROM services
      WHERE LOWER(name) = LOWER($1)
        AND LOWER(type) = LOWER($2)
      LIMIT 1
    `, [name, type]);
  }

  async create(dto: CreateAiServiceDto) {
    const id = randomUUID();

    return await this.db.queryOne(`
      INSERT INTO services (
        id,
        name,
        type,
        description,
        default_config,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb, $6, NOW(), NOW()
      )
      RETURNING
        id,
        name,
        type,
        description,
        default_config AS "defaultConfig",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, [
      id,
      dto.name,
      dto.type,
      dto.description ?? null,
      JSON.stringify(dto.defaultConfig ?? {}),
      dto.status ?? 'active',
    ]);
  }

  async update(id: string, dto: UpdateAiServiceDto) {
    const updates: string[] = [];
    const values: any[] = [id];
    let index = 2;

    if (dto.name !== undefined) {
      updates.push(`name = $${index}`);
      values.push(dto.name);
      index++;
    }

    if (dto.type !== undefined) {
      updates.push(`type = $${index}`);
      values.push(dto.type);
      index++;
    }

    if (dto.description !== undefined) {
      updates.push(`description = $${index}`);
      values.push(dto.description);
      index++;
    }

    if (dto.defaultConfig !== undefined) {
      updates.push(`default_config = $${index}::jsonb`);
      values.push(JSON.stringify(dto.defaultConfig));
      index++;
    }

    if (dto.status !== undefined) {
      updates.push(`status = $${index}`);
      values.push(dto.status);
      index++;
    }

    updates.push(`updated_at = NOW()`);

    return await this.db.queryOne(`
      UPDATE services
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING
        id,
        name,
        type,
        description,
        default_config AS "defaultConfig",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, values);
  }

  async softDelete(id: string) {
    return await this.db.queryOne(`
      UPDATE services
      SET
        status = 'disabled',
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        type,
        description,
        default_config AS "defaultConfig",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, [id]);
  }
}