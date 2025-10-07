import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { EventEntity } from '../../events/entities/event.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { InviteStatus } from './invite-status.enum';
import { CheckinEntity } from '../../checkins/entities/checkin.entity';

@Entity({ name: 'invites' })
export class InviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column({ name: 'recipient_email', nullable: true })
  recipientEmail?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status: InviteStatus;

  @ManyToOne(() => EventEntity, (event) => event.invites, { nullable: false })
  event: EventEntity;

  @ManyToOne(() => UserEntity, (user) => user.invites, { nullable: false })
  createdBy: UserEntity;

  @OneToMany(() => CheckinEntity, (checkin) => checkin.invite)
  checkins: CheckinEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  static generateToken(): string {
    // [CONTRACT-LOCK:INVITE_TOKEN_UUID] NO MODIFICAR SIN MIGRACIÓN
    return uuid();
  }
}
