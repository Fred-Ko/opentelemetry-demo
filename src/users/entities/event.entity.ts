import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('events')
export class Events {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  aggregateId: string;

  @Column()
  type: string;

  @Column('json')
  payload: any;

  @Column()
  timestamp: Date;
}
