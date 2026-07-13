import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuardFn],
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'categories/:id',
    canActivate: [authGuardFn],
    loadComponent: () => import('./dashboard/category-settings/category-settings.component').then(m => m.CategorySettingsComponent),
  },
  {
    path: 'history',
    canActivate: [authGuardFn],
    loadComponent: () => import('./dashboard/history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: 'emails/new',
    canActivate: [authGuardFn],
    loadComponent: () => import('./editor/editor.component').then(m => m.EditorComponent),
  },
  {
    path: 'emails/:id',
    canActivate: [authGuardFn],
    loadComponent: () => import('./editor/editor.component').then(m => m.EditorComponent),
  },
  { path: '**', redirectTo: '' },
];
