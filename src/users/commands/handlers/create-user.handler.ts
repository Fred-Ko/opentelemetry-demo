import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ClientKafka } from '@nestjs/microservices';
import { UserCreatedEvent } from '../../events/impl/user-created.event';
import { CreateUserCommand } from '../impl/create-user.command';
import { UserAggregate } from 'src/users/aggregates/user.aggregate';
import { UserRepository } from 'src/users/repositories/user.repository';
import { v4 as uuidv4 } from 'uuid';

@CommandHandler(CreateUserCommand)
@Injectable()
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: CreateUserCommand) {
    const { name, email } = command;
    const user = new UserAggregate();
    user.registerUser(uuidv4(), name, email);

    await this.userRepository.save(user);

    // Kafka로 이벤트 발행
    this.kafkaClient.emit(
      'user.created',
      JSON.stringify(
        new UserCreatedEvent(user.getUserId(), name, email),
      ),
    );
    Logger.debug(`사용자 생성 이벤트 발송: ${user.getUserId()}`);

    return user.getUserId();
  }
}
