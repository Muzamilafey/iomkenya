import type { Application } from '../../api/types';

export interface StepProps {
  application: Application;
  goTo: (step: number) => void;
}
