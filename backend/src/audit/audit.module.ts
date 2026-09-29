import { Global, Injectable, Logger, Module } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PaginationQueryDto, pageArgs, paginated } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}

// Records important actions ("who did what, when"). Failures are logged, never thrown.
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({ data: entry });
    } catch (error) {
      this.logger.error(`Audit log failed for ${entry.action}: ${(error as Error).message}`);
    }
  }

  async list(query: PaginationQueryDto & { action?: string; entityType?: string }) {
    const where: Prisma.AuditLogWhereInput = {
      action: query.action ? { contains: query.action } : undefined,
      entityType: query.entityType,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
        ...pageArgs(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(data, total, query);
  }
}

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
