import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AiServicesService } from './aiServices.service';
import { SearchAiServicesDto } from './dto/searchAiServices.dto';
import { CreateAiServiceDto } from './dto/createAiService.dto';
import { UpdateAiServiceDto } from './dto/updateAiService.dto';
import { InternalJwtGuard } from '../../guards/internalJwt.guard';
import { Roles } from '../../services/jwt/roles.decorator';
import { RolesGuard } from '../../services/jwt/roles.guard';

@Controller('v1/admin/services')
@UseGuards(InternalJwtGuard, RolesGuard)
@Roles('admin')
export class AiServicesController {
  constructor(private readonly aiServicesService: AiServicesService) {}

  @Get()
  async findMany(@Query() query: SearchAiServicesDto) {
    return await this.aiServicesService.findMany(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.aiServicesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateAiServiceDto) {
    return await this.aiServicesService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAiServiceDto) {
    return await this.aiServicesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.aiServicesService.remove(id);
  }
}