import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // Hash da senha (nunca guardamos a senha em texto puro)
  @Column()
  senha_hash: string;

  @Column({ default: 'admin' })
  papel: string;

  // Hash do refresh token atual. Permite revogar/rotacionar.
  // null = sem sessao ativa (logout).
  @Column({ nullable: true })
  refresh_hash: string;
}
