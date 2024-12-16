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
import { MenuInsightsComponent } from './components/dashboard/menu-insights/menu-insights.component';
import { SalesInsightsComponent } from './components/dashboard/sales-insights/sales-insights.component';

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
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Overview Dashboard' }},
      { path: 'menu-insights', component: MenuInsightsComponent, data: { title: 'Menu Insights' } },
      { path: 'visitor-insights', component: VisitorDashboardComponent, data: { title: 'Visistor Insights' } },
      { path: 'sales-insights', component: SalesInsightsComponent, data: { title: 'Sales Insights' } },
      { path: 'settings/general', component: GeneralComponent, data: { title: 'Settings' } },
      { path: 'settings/about-us', component: AboutComponent, data: { title: 'About us' } },
      { path: 'manage-users', component: ManageUsersComponent, data: { title: 'Manage Users' } },
      { path: 'menus/dashboard', component: MenusComponent, data: { title: 'Menu' } },
      { path: 'menus/add-menu', component: AddMenuComponent, data: { title: 'Add Menu' } },
      { path: 'restaurants', component: RestaurantComponent, data: { title: 'Restaurant' } },
      { path: 'menus/edit-menu/:menuID', component: EditMenuComponent, data: { title: 'Edit Menu' } },
      { path: 'menus/qr-codes', component: QrCodesComponent, data: { title: 'QR codes' } },
      { path: 'settings/add-new-restaurant', component: AddComponent, data: { title: 'New Restaurant' } },
      { path: 'settings/edit-restaurant', component: EditRestaurantComponent, data: { title: 'Edit Restaurant' } },
      { path: 'settings/branding', component: BrandingComponent, data: { title: 'Branding' } },
      { path: 'specials/add-new-special', component: AddSpecialComponent, data: { title: 'Add Specials' } },
      { path: 'specials/edit-special/:id', component: EditSpecialComponent, data: { title: 'Edit Specials' } },
      { path: 'specials', component: SpecialsLandingComponent, data: { title: 'Visistor Insights' } },
      { path: 'help', component: HelpComponent, data: { title: 'Help' } },
      { path: 'help/all-tutorials', component: TutorialsComponent, data: { title: 'All Tutorials' } },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' } 
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
