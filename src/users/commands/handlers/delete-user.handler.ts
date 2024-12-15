import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { DeleteUserCommand } from '../impl/delete-user.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserDeletedEvent } from 'src/users/events/impl/user-deleted.event';


@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @InjectRepository(User, 'write')
    private usersRepository: Repository<User>,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async execute(command: DeleteUserCommand) {
    const user = await this.usersRepository.findOne({ where: { id: command.id } });
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