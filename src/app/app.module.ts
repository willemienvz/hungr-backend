import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { SignInComponent } from './components/sign-in/sign-in.component';
import { SignUpComponent } from './components/sign-up/sign-up.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { Step1Component } from './components/sign-up/step1/step1.component';
import { Step2Component } from './components/sign-up/step2/step2.component';
import { FormDataService } from './shared/services/signup/form-data.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TooltipComponent } from './components/shared/tooltip/tooltip.component';
import { StatsOverviewBlockComponent } from './components/shared/stats-overview-block/stats-overview-block.component';
import { TopMenuComponent } from './components/navigation/top-menu/top-menu.component';
import { SidebarComponent } from './components/navigation/sidebar/sidebar.component';
import { OverviewComponent } from './components/dashboard/overview/overview.component';
import { AppLayoutComponent } from './app-layout/app-layout.component';
import { StatsTableBlockComponent } from './components/shared/stats-table-block/stats-table-block.component';
import { CategoryInsightsComponent } from './components/shared/stats/overview/category-insights/category-insights.component';
import { MostOrderedComponent } from './components/shared/stats/overview/most-ordered/most-ordered.component';
import { AdditionalInsightsComponent } from './components/shared/stats/overview/additional-insights/additional-insights.component';
import { GeneralComponent } from './components/settings/general/general.component';
import { ManageUsersComponent } from './components/manage-users/manage-users.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@NgModule({
  declarations: [
    AppComponent,
    SignInComponent,
    SignUpComponent,
    DashboardComponent,
    ForgotPasswordComponent,
    VerifyEmailComponent,
    Step1Component,
    Step2Component,
    TooltipComponent,
    StatsOverviewBlockComponent,
    TopMenuComponent,
    SidebarComponent,
    OverviewComponent,
    AppLayoutComponent,
    StatsTableBlockComponent,
    CategoryInsightsComponent,
    MostOrderedComponent,
    AdditionalInsightsComponent,
    GeneralComponent,
    ManageUsersComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase, 'hungr-firebase-app'),
    AngularFireAuthModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatSlideToggleModule,
  ],
  providers: [FormDataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
