import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import type { Repository } from 'typeorm';
import { UserCreatedEvent } from '../../events/impl/user-created.event';
import { CreateUserCommand } from '../impl/create-user.command';

@CommandHandler(CreateUserCommand)
@Injectable()
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @InjectRepository(User, 'write')
    private usersRepository: Repository<User>,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async execute(command: CreateUserCommand) {
    const user = {
      name: command.name,
      email: command.email,
      password: command.password,
    };

    const savedUser = await this.usersRepository.save(user);

    // Kafka로 이벤트 발행
    this.kafkaClient.emit(
      'user.created',
      JSON.stringify(
        new UserCreatedEvent(savedUser.id, savedUser.name, savedUser.email),
      ),
    );
    Logger.debug(`사용자 생성 이벤트 발송: ${savedUser.id}`);

    return savedUser;
  }
}
