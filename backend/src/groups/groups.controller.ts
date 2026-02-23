import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const group = await this.groupsService.findOne(id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard)
  async findSubmissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.findByGroupId(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const group = await this.groupsService.update(id, dto);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const group = await this.groupsService.remove(id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }
}
