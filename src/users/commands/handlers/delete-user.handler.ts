import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ClientKafka } from '@nestjs/microservices';
import { UserDeletedEvent } from 'src/users/events/impl/user-deleted.event';
import { DeleteUserCommand } from '../impl/delete-user.command';
import { UserRepository } from 'src/users/repositories/user.repository';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: DeleteUserCommand) {
    const user = await this.userRepository.findById(command.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(command.id);

    this.kafkaClient.emit(
      'user.deleted',
      JSON.stringify(new UserDeletedEvent(command.id)),
    );
    Logger.debug(`사용자 삭제 이벤트 발송: ${command.id}`);

    return user.getUserId();
  }
}
