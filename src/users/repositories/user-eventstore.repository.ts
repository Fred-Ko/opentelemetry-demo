import { Injectable } from '@nestjs/common';
import { UserAggregate } from '../aggregates/user.aggregate';
import { UserRepository } from './user.repository';

import { EventPublisher } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Events } from 'src/users/entities/event.entity';
import type { Repository } from 'typeorm';

@Injectable()
export class UserEventStoreRepository implements UserRepository {
  constructor(
    @InjectRepository(Events, 'write')
    private readonly eventStore: Repository<Events>,
    private readonly publisher: EventPublisher,
  ) {}

  async findById(userId: string): Promise<UserAggregate | null> {
    const events = await this.eventStore.find({
      where: { aggregateId: userId },
    });
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
      await this.eventStore.save(uncommitted);
      user.commit();
    }
  }

  async delete(userId: string): Promise<void> {
    // 사용자 삭제 로직을 구현합니다.
    // 예를 들어, 삭제 이벤트를 저장소에 기록할 수 있습니다.
  }
}
