import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { UserUpdatedEvent } from 'src/users/events/impl/user-updated.event';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UpdateUserCommand } from '../impl/update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @InjectRepository(User, 'write')
    private usersRepository: Repository<User>,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async execute(command: UpdateUserCommand) {
    const user = await this.usersRepository.findOne({
      where: { id: command.id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (command.name) user.name = command.name;
    if (command.email) user.email = command.email;

    const updatedUser = await this.usersRepository.save(user);

    this.kafkaClient.emit(
      'user.updated',
      JSON.stringify(new UserUpdatedEvent(updatedUser.id, updatedUser.name, updatedUser.email)),
    );
    Logger.debug(`사용자 수정 이벤트 발송: ${updatedUser.id}`);

    return updatedUser;
  }
}
