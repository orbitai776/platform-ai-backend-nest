import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { listResponse, successResponse } from '../../common/response/adminResponse.util';
import { AiServicesRepository } from './aiServices.repository';
import { CreateAiServiceDto } from './dto/createAiService.dto';
import { SearchAiServicesDto } from './dto/searchAiServices.dto';
import { UpdateAiServiceDto } from './dto/updateAiService.dto';

@Injectable()
export class AiServicesService {
  constructor(private readonly repo: AiServicesRepository) {}

  async findMany(dto: SearchAiServicesDto) {
    const result = await this.repo.findMany(dto);
    return listResponse(result.items, result.pagination, 'Admin AI services fetched successfully');
  }

  async findOne(id: string) {
    const item = await this.repo.findById(id);

    if (!item) {
      throw new NotFoundException('AI service not found');
    }

    return successResponse(item, 'Admin AI service detail fetched successfully');
  }

  async create(dto: CreateAiServiceDto) {
    const duplicate = await this.repo.findDuplicate(dto.name, dto.type);

    if (duplicate) {
      throw new ConflictException('AI service with the same name and type already exists');
    }

    const created = await this.repo.create(dto);
    return successResponse(created, 'AI service created successfully');
  }

  async update(id: string, dto: UpdateAiServiceDto) {
    const existing = await this.repo.findById(id);

    if (!existing) {
      throw new NotFoundException('AI service not found');
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Update payload is empty');
    }

    const nextName = dto.name ?? existing.name;
    const nextType = dto.type ?? existing.type;
    const duplicate = await this.repo.findDuplicate(nextName, nextType, id);

    if (duplicate) {
      throw new ConflictException('Another AI service with the same name and type already exists');
    }

    const updated = await this.repo.update(id, dto);
    return successResponse(updated, 'AI service updated successfully');
  }

  async remove(id: string) {
    const existing = await this.repo.findById(id);

    if (!existing) {
      throw new NotFoundException('AI service not found');
    }

    if (existing.status === 'disabled') {
      return successResponse(existing, 'AI service is already disabled');
    }

    const disabled = await this.repo.softDelete(id);

    return successResponse(disabled, 'AI service disabled successfully');
  }
}
