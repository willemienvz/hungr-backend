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
import { AboutComponent } from './components/settings/about/about.component';
import { AddSpecialComponent } from './components/specials/add-special/add-special.component';
import { SpecialsLandingComponent } from './components/specials/specials-landing/specials-landing.component';
import { EditSpecialComponent } from './components/specials/edit-special/edit-special.component';
import { HelpComponent } from './components/help/help/help.component';
import { TutorialsComponent } from './components/help/tutorials/tutorials.component';
import { RestaurantComponent } from './components/restaurant/restaurant.component';
import { VisitorDashboardComponent } from './components/dashboard/visitor-dashboard/visitor-dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: '/sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: SignInComponent },
  { path: 'register-user', component: SignUpComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'confirm-user', component: ConfirmUserComponent },
  { path: 'verify-email-address', component: VerifyEmailComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'visitor-insights', component: VisitorDashboardComponent },
      { path: 'settings/general', component: GeneralComponent },
      { path: 'settings/about-us', component: AboutComponent },
      { path: 'manage-users', component: ManageUsersComponent },
      { path: 'menus/dashboard', component: MenusComponent },
      { path: 'menus/add-menu', component: AddMenuComponent },
      { path: 'restaurants', component: RestaurantComponent },
      { path: 'menus/edit-menu/:menuID', component: EditMenuComponent },
      { path: 'menus/qr-codes', component: QrCodesComponent },
      { path: 'settings/add-new-restaurant', component: AddComponent },
      { path: 'settings/edit-restaurant', component: EditRestaurantComponent },
      { path: 'settings/branding', component: BrandingComponent },
      { path: 'specials/add-new-special', component: AddSpecialComponent },
      { path: 'specials/edit-special/:id', component: EditSpecialComponent },
      { path: 'specials', component: SpecialsLandingComponent },
      { path: 'help', component: HelpComponent },
      { path: 'help/all-tutorials', component: TutorialsComponent },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' } 
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
