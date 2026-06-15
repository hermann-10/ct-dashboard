import { Routes } from '@angular/router';

export const DOOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./door.component').then(m => m.DoorComponent),
  },
];
