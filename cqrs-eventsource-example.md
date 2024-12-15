```typescript
// user-registered.event.ts
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly email: string,
  ) {}
}
```

```typescript
// user-name-changed.event.ts
export class UserNameChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly newName: string,
  ) {}
}
```

```typescript
// user.aggregate.ts
import { AggregateRoot } from '@nestjs/cqrs';
import { UserRegisteredEvent } from './events/user-registered.event';
import { UserNameChangedEvent } from './events/user-name-changed.event';

export class UserAggregate extends AggregateRoot {
  private id: string;
  private name: string;
  private email: string;

  constructor(id?: string) {
    super();
    if (id) {
      this.id = id;
    }
  }

  registerUser(id: string, name: string, email: string) {
    this.apply(new UserRegisteredEvent(id, name, email));
  }

  changeName(newName: string) {
    this.apply(new UserNameChangedEvent(this.id, newName));
  }

  onUserRegisteredEvent(event: UserRegisteredEvent) {
    this.id = event.userId;
    this.name = event.name;
    this.email = event.email;
  }

  onUserNameChangedEvent(event: UserNameChangedEvent) {
    this.name = event.newName;
  }

  getUserId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }
}
```

```typescript
// user.repository.ts
import { UserAggregate } from './user.aggregate';

export interface UserRepository {
  findById(userId: string): Promise<UserAggregate | null>;
  save(user: UserAggregate): Promise<void>;
}
```

```typescript
// eventstore.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventStore {
  async saveEvents(aggregateId: string, events: any[]): Promise<void> {
    // Implement actual DB insert logic here
  }

  async getEvents(aggregateId: string): Promise<any[]> {
    // Implement actual DB fetch logic here
    return [];
  }
}
```

```typescript
// user.eventstore.repository.ts
import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserAggregate } from './user.aggregate';
import { EventStore } from './eventstore';
import { EventPublisher } from '@nestjs/cqrs';

@Injectable()
export class UserEventStoreRepository implements UserRepository {
  constructor(
    private readonly eventStore: EventStore,
    private readonly publisher: EventPublisher,
  ) {}

  async findById(userId: string): Promise<UserAggregate | null> {
    const events = await this.eventStore.getEvents(userId);
    if (events.length === 0) {
      return null;
    }
    const user = this.publisher.mergeObjectContext(new UserAggregate(userId));
    for (const event of events) {
      user.apply(event, true);
    }
    return user;
  }

  async save(user: UserAggregate): Promise<void> {
    const uncommitted = user.getUncommittedEvents();
    if (uncommitted.length > 0) {
      await this.eventStore.saveEvents(user.getUserId(), uncommitted);
      user.commit();
    }
  }
}
```

```typescript
// register-user.command.ts
export class RegisterUserCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly email: string,
  ) {}
}
```

```typescript
// change-user-name.command.ts
export class ChangeUserNameCommand {
  constructor(
    public readonly userId: string,
    public readonly newName: string,
  ) {}
}
```

```typescript
// register-user.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterUserCommand } from './register-user.command';
import { UserRepository } from '../user.repository';
import { UserAggregate } from '../user.aggregate';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: RegisterUserCommand) {
    const { userId, name, email } = command;
    const user = new UserAggregate();
    user.registerUser(userId, name, email);

    await this.userRepository.save(user);
    return userId;
  }
}
```

```typescript
// change-user-name.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ChangeUserNameCommand } from './change-user-name.command';
import { UserRepository } from '../user.repository';

@CommandHandler(ChangeUserNameCommand)
export class ChangeUserNameHandler implements ICommandHandler<ChangeUserNameCommand> {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: ChangeUserNameCommand) {
    const { userId, newName } = command;
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.changeName(newName);
    await this.userRepository.save(user);
  }
}
```

```typescript
// get-user.query.ts
export class GetUserQuery {
  constructor(public readonly userId: string) {}
}
```

```typescript
// get-user.handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from './get-user.query';
import { UserRepository } from '../user.repository';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: GetUserQuery) {
    const { userId } = query;
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    return {
      userId: user.getUserId(),
      name: user.getName(),
      email: user.getEmail(),
    };
  }
}
```

```typescript
// user.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventStore } from './eventstore';
import { UserEventStoreRepository } from './user.eventstore.repository';
import { RegisterUserHandler } from './commands/register-user.handler';
import { ChangeUserNameHandler } from './commands/change-user-name.handler';
import { GetUserHandler } from './queries/get-user.handler';

const CommandHandlers = [RegisterUserHandler, ChangeUserNameHandler];
const QueryHandlers = [GetUserHandler];

@Module({
  imports: [CqrsModule],
  providers: [
    EventStore,
    {
      provide: 'UserRepository',
      useClass: UserEventStoreRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class UserModule {}
```