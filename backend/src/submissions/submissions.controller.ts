import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmissionsService } from './submissions.service';
import { UploadSubmissionDto } from './dto/upload-submission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly usersService: UsersService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads',
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname) || '';
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSubmissionDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Check if user is approved (owner and admins are always approved)
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.role !== 'owner' && user.role !== 'admin' && !user.isApproved) {
      throw new ForbiddenException('Your account must be approved by your team leader before uploading files');
    }
    
    return this.submissionsService.create({
      groupId: dto.groupId,
      title: dto.title,
      uploadedBy: dto.uploadedBy,
      fileUrl: `/uploads/${file.filename}`,
    });
  }

  @Post()
  create(@Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.submissionsService.findAll();
  }

  @Get(':id/view')
  async view(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const submission = await this.submissionsService.findOne(id);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (!submission.fileUrl) {
      throw new NotFoundException('File not found');
    }

    // Extract filename from fileUrl (e.g., '/uploads/filename.pdf' -> 'filename.pdf')
    const filename = submission.fileUrl.split('/').pop();
    if (!filename) {
      throw new NotFoundException('Invalid file path');
    }
    
    const filePath = join(process.cwd(), 'uploads', filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const file = createReadStream(filePath);
    const extension = extname(filename).toLowerCase();
    
    // Set content type based on file extension for browser viewing
    let contentType = 'application/octet-stream';
    
    // Documents
    if (extension === '.pdf') {
      contentType = 'application/pdf';
    } else if (extension === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (extension === '.doc') {
      contentType = 'application/msword';
    } else if (extension === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (extension === '.xls') {
      contentType = 'application/vnd.ms-excel';
    } else if (extension === '.pptx') {
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (extension === '.ppt') {
      contentType = 'application/vnd.ms-powerpoint';
    }
    // Images
    else if (['.jpg', '.jpeg'].includes(extension)) {
      contentType = 'image/jpeg';
    } else if (extension === '.png') {
      contentType = 'image/png';
    } else if (extension === '.gif') {
      contentType = 'image/gif';
    } else if (extension === '.svg') {
      contentType = 'image/svg+xml';
    } else if (extension === '.webp') {
      contentType = 'image/webp';
    }
    // Text files
    else if (extension === '.txt') {
      contentType = 'text/plain';
    } else if (extension === '.html' || extension === '.htm') {
      contentType = 'text/html';
    } else if (extension === '.css') {
      contentType = 'text/css';
    } else if (extension === '.js') {
      contentType = 'text/javascript';
    } else if (extension === '.json') {
      contentType = 'application/json';
    } else if (extension === '.xml') {
      contentType = 'application/xml';
    }
    // Audio
    else if (extension === '.mp3') {
      contentType = 'audio/mpeg';
    } else if (extension === '.wav') {
      contentType = 'audio/wav';
    } else if (extension === '.ogg') {
      contentType = 'audio/ogg';
    }
    // Video
    else if (extension === '.mp4') {
      contentType = 'video/mp4';
    } else if (extension === '.webm') {
      contentType = 'video/webm';
    } else if (extension === '.avi') {
      contentType = 'video/x-msvideo';
    }
    // Archives (force download for these)
    else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extension)) {
      contentType = 'application/octet-stream';
    }
    
    // Set response headers for inline viewing
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${submission.title}${extname(filename)}"`,
    });

    return new StreamableFile(file);
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const submission = await this.submissionsService.findOne(id);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (!submission.fileUrl) {
      throw new NotFoundException('File not found');
    }

    // Extract filename from fileUrl (e.g., '/uploads/filename.pdf' -> 'filename.pdf')
    const filename = submission.fileUrl.split('/').pop();
    if (!filename) {
      throw new NotFoundException('Invalid file path');
    }
    
    const filePath = join(process.cwd(), 'uploads', filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const file = createReadStream(filePath);
    
    // Set response headers
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${submission.title}${extname(filename)}"`,
    });

    return new StreamableFile(file);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const submission = await this.submissionsService.findOne(id);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return submission;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    const submission = await this.submissionsService.update(id, dto);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return submission;
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const submission = await this.submissionsService.remove(id);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return submission;
  }
}
