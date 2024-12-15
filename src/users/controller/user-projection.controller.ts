import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRead } from '../entities/user-read.entity';

@Controller()
export class UserProjectionController {
  constructor(
    @InjectRepository(UserRead, 'read')
    private readonly userReadRepository: Repository<UserRead>,
  ) {}

  @MessagePattern('user.created')
  async handleUserCreated(@Payload() event: any) {
    Logger.debug(`사용자 생성 이벤트 수신: ${JSON.stringify(event)}`);

    try {
      const userRead = this.userReadRepository.create({
        id: event.id,
        name: event.name,
        email: event.email,
        isActive: true,
      });
      await this.userReadRepository.save(userRead);
      Logger.debug(`사용자 생성 완료: ${event.id}`);
    } catch (error) {
      Logger.error(`사용자 생성 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('user.updated')
  async handleUserUpdated(@Payload() event: any) {
    Logger.debug(`사용자 수정 이벤트 수신: ${JSON.stringify(event)}`);

    try {
      await this.userReadRepository.update(
        { id: event.id },
        {
          name: event.name,
          email: event.email,
          lastUpdated: new Date(),
        },
      );
      Logger.debug(`사용자 수정 완료: ${event.id}`);
    } catch (error) {
      Logger.error(`사용자 수정 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('user.deleted')
  async handleUserDeleted(@Payload() event: any) {
    Logger.debug(`사용자 삭제 이벤트 수신: ${JSON.stringify(event)}`);

    try {
      await this.userReadRepository.delete(event.id);
      Logger.debug(`사용자 삭제 완료: ${event.id}`);
    } catch (error) {
      Logger.error(`사용자 삭제 실패: ${error.message}`, error.stack);
      throw error;
    }
  }
}
