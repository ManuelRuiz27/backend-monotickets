import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InviteEntity } from '../../invites/entities/invite.entity';

@Entity({ name: 'checkins' })
export class CheckinEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InviteEntity, (invite) => invite.checkins, { nullable: false })
  invite: InviteEntity;

  @Column()
  gate: string;

  @Column({ name: 'pass_type', nullable: true })
  passType?: string;

  @Column({ name: 'is_duplicate', default: false })
  isDuplicate: boolean;

  @Column({ default: false })
  offline: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
