아래는 User 도메인을 Event Sourcing 및 CQRS를 활용하여 구현하는 개략적인 예시입니다. 요구사항은 “DB는 오직 이벤트만 존재”하고, 해당 이벤트 스트림을 통해 User 상태를 재구성하는 방식입니다. 이 때, User 상태를 영속화하는 별도의 엔티티(예: 유저 정보 테이블)가 아닌, 오직 이벤트 테이블(또는 event store)만이 DB에 존재하며, 상태 조회 시 이벤트 재생(replay)을 통해 User의 현재 상태를 산출할 수 있습니다.

아래 예시에서는 NestJS CQRS 패턴과 Event Sourcing 개념을 가미하였으며, 핵심 개념은 다음과 같습니다.

- **Command**: User의 상태를 변경하는 의도가 담긴 명령. 예: `RegisterUserCommand`, `ChangeUserNameCommand`  
- **Command Handler**: Command를 처리하고 비즈니스 로직 실행 후 이벤트를 발생시킴.
- **Event**: User의 상태 변화를 나타내는 불변 이벤트. 예: `UserRegisteredEvent`, `UserNameChangedEvent`  
- **Aggregate (User Aggregate)**: User 상태와 비즈니스 로직을 담은 집합체. `AggregateRoot`를 상속하고 `apply(event)`를 통해 이벤트 발생.  
- **Event Store**: 모든 이벤트를 순서대로 저장하는 단일 소스. DB에는 이 이벤트 기록만 존재.
- **Event Handler**: 이벤트 발생 시 읽기 모델 업데이트나, 다른 후처리를 담당. 여기서는 읽기 모델없이 단순히 로깅이나 추가 액션으로 예시.
- **Query & Projection**: User 상태 조회 시, event store로부터 해당 User의 이벤트를 재생하여 메모리 상의 Aggregate를 복구한 뒤 상태를 반환. 실제로는 Query Handler에서 이벤트를 불러와 Aggregate를 replay한 뒤 결과를 반환하는 식으로 구현.

### 주요 흐름

1. **User Registration**: `RegisterUserCommand`를 통해 사용자를 등록.
   - `RegisterUserCommandHandler`가 호출되어 User Aggregate를 생성하고 `UserRegisteredEvent` 이벤트 발생.
   - 이벤트 스토어에 `UserRegisteredEvent` 저장.
   
2. **Change User Name**: `ChangeUserNameCommand`로 사용자 이름 변경.
   - `ChangeUserNameCommandHandler`에서 이벤트(`UserNameChangedEvent`) 발생.
   - 이벤트 스토어에 `UserNameChangedEvent` 저장.
   
3. **User 상태 조회**: `GetUserQuery` 실행 시 이벤트 스토어에서 해당 User의 이벤트들을 모두 가져와서 User Aggregate에 replay 후, 현재 상태 반환.

### 예시 코드 구조

#### 이벤트 클래스 정의

```typescript
// user-registered.event.ts
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly email: string,
  ) {}
}

// user-name-changed.event.ts
export class UserNameChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly newName: string,
  ) {}
}
```

#### Aggregate 구현

User Aggregate는 `AggregateRoot`를 상속하며, `apply()`를 통해 이벤트를 발생시키고, 발생한 이벤트에 따라 자신의 상태를 변경하는 로직(`onUserRegisteredEvent`, `onUserNameChangedEvent`)을 포함합니다.

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

  // 최초 등록 로직
  registerUser(id: string, name: string, email: string) {
    this.apply(new UserRegisteredEvent(id, name, email));
  }

  changeName(newName: string) {
    this.apply(new UserNameChangedEvent(this.id, newName));
  }

  // 이벤트 핸들러(aggregate 내부)
  onUserRegisteredEvent(event: UserRegisteredEvent) {
    this.id = event.userId;
    this.name = event.name;
    this.email = event.email;
  }

  onUserNameChangedEvent(event: UserNameChangedEvent) {
    this.name = event.newName;
  }

  // AggregateRoot의 변형된 apply 메서드가 이벤트를 commit할 때 호출
  // commit 이후 발생한 이벤트를 EventStore에 저장하는 로직은 외부 Infrastructure에서 처리

  // 현재 상태 조회용 getter
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

`AggregateRoot`는 `apply()`로 이벤트를 적용할 때 `on<EventName>` 패턴으로 정의된 메서드를 찾습니다(`onUserRegisteredEvent`, `onUserNameChangedEvent`). 이를 통해 상태 변화가 이벤트에 따라 반영됩니다.

#### Command 정의

```typescript
// register-user.command.ts
export class RegisterUserCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly email: string,
  ) {}
}

// change-user-name.command.ts
export class ChangeUserNameCommand {
  constructor(
    public readonly userId: string,
    public readonly newName: string,
  ) {}
}
```

#### Command Handler 구현

Command Handler는 주어진 명령을 처리하고, Aggregate를 통해 이벤트를 발생시킨 뒤 commit합니다.  
이 때 DB에는 오직 이벤트만 존재하므로, User를 새로 생성하거나 상태를 변경할 때는 이벤트 스토어(EventRepository)를 통해 과거 이벤트를 가져와 Aggregate를 재구성한 뒤 명령을 처리합니다.

```typescript
// register-user.handler.ts
import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { RegisterUserCommand } from './register-user.command';
import { UserAggregate } from '../user.aggregate';
import { UserEventStore } from '../user.eventstore'; // 이벤트를 저장하고 불러오는 EventStore 구현

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly eventStore: UserEventStore, 
  ) {}

  async execute(command: RegisterUserCommand) {
    const { userId, name, email } = command;
    // 새로운 유저 생성
    const user = this.publisher.mergeObjectContext(new UserAggregate());
    user.registerUser(userId, name, email);
    user.commit(); 
    // commit시 발생한 이벤트를 eventStore에 저장
    await this.eventStore.saveEvents(userId, user.getUncommittedEvents());
    user.clearUncommittedEvents();
    return userId;
  }
}

// change-user-name.handler.ts
import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { ChangeUserNameCommand } from './change-user-name.command';
import { UserEventStore } from '../user.eventstore';
import { UserAggregate } from '../user.aggregate';

@CommandHandler(ChangeUserNameCommand)
export class ChangeUserNameHandler implements ICommandHandler<ChangeUserNameCommand> {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly eventStore: UserEventStore,
  ) {}

  async execute(command: ChangeUserNameCommand) {
    const { userId, newName } = command;
    
    // 이벤트 스토어에서 userId에 해당하는 모든 이벤트 불러와서 Aggregate 복원
    const events = await this.eventStore.getEvents(userId);
    const user = this.publisher.mergeObjectContext(new UserAggregate(userId));
    for (const event of events) {
      user.apply(event, true); // true면 aggregate 상태만 업데이트하고 uncommittedEvents에는 쌓지 않음
    }

    // 새로운 명령 처리
    user.changeName(newName);
    user.commit();
    // 신규 이벤트 저장
    await this.eventStore.saveEvents(userId, user.getUncommittedEvents());
    user.clearUncommittedEvents();
  }
}
```

여기서 `UserEventStore`는 이벤트를 데이터베이스에 저장하고, 특정 aggregateId(userId)에 해당하는 모든 이벤트를 불러오는 로직을 담은 리포지토리 인터페이스로 가정합니다. 이 `eventStore`는 오직 이벤트 테이블만을 사용합니다.

#### Event Store 구현 예시 (개념적)

```typescript
// user.eventstore.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserEventStore {
  constructor(/* Inject your DB connection or repository */) {}

  async saveEvents(userId: string, events: any[]) {
    // db.insert({ aggregateId: userId, events: JSON.stringify(events), timestamp: ... })
    // 실제 구현에서는 event sourcing용 테이블에 
    // aggregateId, eventType, payload, version, timestamp 등을 저장
  }

  async getEvents(userId: string): Promise<any[]> {
    // db.select from events where aggregateId = userId order by version or timestamp
    // 조회된 events를 deserialize 하여 return
    return [];
  }
}
```

실제 구현 시에는 각 이벤트를 JSON 형태로 serialize하여 DB에 저장하고, `aggregateId`, `version`(이벤트의 순서), `timestamp` 등을 함께 관리합니다.

#### Query 구현

Query를 통해 User 상태를 조회하려면, 이벤트 스토어로부터 해당 User의 모든 이벤트를 불러와 `UserAggregate`에 replay한 뒤 현재 상태를 반환합니다.

```typescript
// get-user.query.ts
export class GetUserQuery {
  constructor(
    public readonly userId: string,
  ) {}
}

// get-user.handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from './get-user.query';
import { UserEventStore } from '../user.eventstore';
import { UserAggregate } from '../user.aggregate';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    private readonly eventStore: UserEventStore,
  ) {}

  async execute(query: GetUserQuery) {
    const { userId } = query;
    const events = await this.eventStore.getEvents(userId);
    const user = new UserAggregate(userId);
    for (const event of events) {
      user.apply(event, true);
    }
    // 이제 user Aggregate는 현재 상태를 담고 있음
    return {
      userId: user.getUserId(),
      name: user.getName(),
      email: user.getEmail(),
    };
  }
}
```

#### Event Handler (옵션)

아래는 이벤트 발생 후 추가적인 처리가 필요한 경우의 예시(예: 로그 남기기). DB에 다른 읽기 모델을 두지 않는다면 여기서는 주로 로깅이나 외부 시스템 연동 등에 쓰일 수 있습니다.

```typescript
// user-registered.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegisteredEvent } from './user-registered.event';

@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  handle(event: UserRegisteredEvent) {
    console.log(`New user registered: ${event.userId}, ${event.name}, ${event.email}`);
  }
}

// user-name-changed.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserNameChangedEvent } from './user-name-changed.event';

@EventsHandler(UserNameChangedEvent)
export class UserNameChangedHandler implements IEventHandler<UserNameChangedEvent> {
  handle(event: UserNameChangedEvent) {
    console.log(`User name changed: ${event.userId} -> ${event.newName}`);
  }
}
```

#### Module 구성

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Command Handlers
import { RegisterUserHandler } from './commands/register-user.handler';
import { ChangeUserNameHandler } from './commands/change-user-name.handler';

// Query Handlers
import { GetUserHandler } from './queries/get-user.handler';

// Event Handlers
import { UserRegisteredHandler } from './events/user-registered.handler';
import { UserNameChangedHandler } from './events/user-name-changed.handler';

import { UserEventStore } from './user.eventstore';

@Module({
  imports: [CqrsModule],
  providers: [
    UserEventStore,
    RegisterUserHandler,
    ChangeUserNameHandler,
    GetUserHandler,
    UserRegisteredHandler,
    UserNameChangedHandler,
  ],
})
export class UserModule {}
```

### 정리

위 예시는 User 도메인을 Event Sourcing/CQRS 패턴 하에 구현하는 개념적인 예시입니다. DB는 오직 이벤트(aggregateId, version, eventType, payload, timestamp 등)를 저장하는 테이블만 갖고, 상태를 요청할 때는 모든 이벤트를 재생해 상태를 구성합니다. 이로써 Event Sourcing 요구사항(“db는 event 하나만 존재”)을 충족하며, CQRS로 명령(Command)과 조회(Query), 이벤트 흐름(Event)을 분리하여 확장성과 유연성을 확보할 수 있습니다.