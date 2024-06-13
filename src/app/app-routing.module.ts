import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './shared/guard/auth.guard';
import { SignInComponent } from './components/sign-in/sign-in.component';
import { SignUpComponent } from './components/sign-up/sign-up.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { AppLayoutComponent } from './app-layout/app-layout.component';
import { GeneralComponent } from './components/settings/general/general.component';
import { ManageUsersComponent } from './components/manage-users/manage-users.component';
import { ConfirmUserComponent } from './components/manage-users/confirm-user/confirm-user.component';
import { QrCodesComponent } from './components/qr-codes/qr-codes.component';
import { AddComponent } from './components/restaurant/add/add.component';
import { EditRestaurantComponent } from './components/restaurant/edit-restaurant/edit-restaurant.component';
import { BrandingComponent } from './components/settings/branding/branding.component';
import { MenusComponent } from './components/menus/menus.component';
import { AddMenuComponent } from './components/menus/add-menu/add-menu.component';
import { EditMenuComponent } from './components/menus/edit-menu/edit-menu.component';


const routes: Routes = [
  { path: '', redirectTo: '/sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: SignInComponent },
  { path: 'register-user', component: SignUpComponent },
 // { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]  },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'confirm-user', component: ConfirmUserComponent },
  { path: 'verify-email-address', component: VerifyEmailComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'settings/general', component: GeneralComponent },
      { path: 'manage-users', component: ManageUsersComponent },
      { path: 'menus', component: MenusComponent },
      { path: 'menus/add-menu', component: AddMenuComponent },
      { path: 'menus/edit-menu/:menuID', component: EditMenuComponent },
      { path: 'menus/qr-codes', component: QrCodesComponent },
      { path: 'settings/add-new-restaurant', component: AddComponent },
      { path: 'settings/edit-restaurant', component: EditRestaurantComponent },
      { path: 'settings/branding', component: BrandingComponent },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' } 
    ]
  }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}