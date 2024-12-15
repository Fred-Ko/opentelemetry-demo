import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetUsersQuery } from '../get-users.query';
import { UserReadEntity } from '../../entities/user-read.entity';
import { UserRead } from '../../graphql/user-read.type';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @InjectRepository(UserReadEntity, 'read')
    private userRepository: Repository<UserReadEntity>,
  ) {}

  async execute(query: GetUsersQuery) {
    return this.getUsers();
  }

  async getUsers(): Promise<UserRead[]> {
    const userEntities: UserReadEntity[] = await this.userRepository.find();
    return userEntities.map(entity => ({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      isActive: entity.isActive,
      lastUpdated: entity.lastUpdated,
    }));
  }
} 