import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ClientKafka } from '@nestjs/microservices';
import { UserUpdatedEvent } from 'src/users/events/impl/user-updated.event';
import { UserRepository } from 'src/users/repositories/user.repository';
import { UpdateUserCommand } from '../impl/update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: UpdateUserCommand) {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.updateUser(command.newName, command.newEmail);
    await this.userRepository.save(user);

    this.kafkaClient.emit(
      'user.updated',
      JSON.stringify(
        new UserUpdatedEvent(user.getUserId(), user.getName(), user.getEmail()),
      ),
    );
    Logger.debug(`사용자 수정 이벤트 발송: ${user.getUserId()}`);
    return user.getUserId();
  }
}
