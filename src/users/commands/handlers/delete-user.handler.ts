import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDeletedEvent } from 'src/users/events/user-deleted.event';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { DeleteUserCommand } from '../delete-user.command';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @InjectRepository(UserEntity, 'write')
    private usersRepository: Repository<UserEntity>,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async execute(command: DeleteUserCommand) {
    const user = await this.usersRepository.findOne({
      where: { id: command.id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.delete(command.id);

    this.kafkaClient.emit(
      'user.deleted',
      JSON.stringify(new UserDeletedEvent(command.id)),
    );
    Logger.debug(`사용자 삭제 이벤트 발송: ${command.id}`);

    return true;
  }
}
