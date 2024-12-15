import { UserAggregate } from '../aggregates/user.aggregate';

export interface UserRepository {
  findById(userId: string): Promise<UserAggregate | null>;
  save(user: UserAggregate): Promise<void>;
  delete(userId: string): Promise<void>;
} 