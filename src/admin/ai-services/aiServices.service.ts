import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiServicesRepository } from './aiServices.repository';
import { SearchAiServicesDto } from './dto/searchAiServices.dto';
import { CreateAiServiceDto } from './dto/createAiService.dto';
import { UpdateAiServiceDto } from './dto/updateAiService.dto';

@Injectable()
export class AiServicesService {
  constructor(private readonly repo: AiServicesRepository) {}

  async findMany(dto: SearchAiServicesDto) {
    return await this.repo.findMany(dto);
  }

  async findOne(id: string) {
    const item = await this.repo.findById(id);

    if (!item) {
      throw new NotFoundException('AI service not found');
    }

    return item;
  }

  async create(dto: CreateAiServiceDto) {
    const duplicate = await this.repo.findDuplicate(dto.name, dto.type);

    if (duplicate) {
      throw new ConflictException(
        'AI service with the same name and type already exists',
      );
    }

    return await this.repo.create(dto);
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
      throw new ConflictException(
        'Another AI service with the same name and type already exists',
      );
    }

    return await this.repo.update(id, dto);
  }

  async remove(id: string) {
    const existing = await this.repo.findById(id);

    if (!existing) {
      throw new NotFoundException('AI service not found');
    }

    const usage = await this.repo.countUsageInPartnerServices(id);

    if ((usage?.total ?? 0) > 0) {
      throw new ConflictException(
        'This AI service is already used by partner_services, cannot delete',
      );
    }

    const deleted = await this.repo.delete(id);

    return {
      success: true,
      deleted,
    };
  }
}