import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  idUsers: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nameUsers: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
  })
  password_hash: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  created_at: Date;
}