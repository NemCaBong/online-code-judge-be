import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('languages')
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', name: 'compile_cmd', nullable: true })
  compileCommand: string;

  @Column({ type: 'varchar', name: 'run_cmd', nullable: true })
  executeCommand: string;

  @Column({ type: 'varchar', name: 'source_file', nullable: true })
  sourceFile: string;

  @Column({ type: 'boolean', name: 'is_archived', default: false })
  isArchived: boolean;
}
