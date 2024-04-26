import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
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
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { LoadingComponent } from './components/shared/loading/loading.component';
import { AddUserDialogComponent } from './components/manage-users/add-user-dialog/add-user-dialog.component';
import { ConfirmUserComponent } from './components/manage-users/confirm-user/confirm-user.component';
import { QrCodesComponent } from './components/qr-codes/qr-codes.component';
import { EditQrComponent } from './components/qr-codes/edit-qr/edit-qr.component';
import { ViewQrComponent } from './components/qr-codes/view-qr/view-qr.component';
import { DeleteQrComponent } from './components/qr-codes/delete-qr/delete-qr.component';
import { AddQrComponent } from './components/qr-codes/add-qr/add-qr.component';
import { QRCodeModule } from 'angularx-qrcode';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SummaryComponent } from './components/restaurant/summary/summary.component';
import { AddComponent } from './components/restaurant/add/add.component';
import { EditRestaurantComponent } from './components/restaurant/edit-restaurant/edit-restaurant.component';
import { BrandingComponent } from './components/settings/branding/branding.component';
import { NgxColorsModule } from 'ngx-colors';
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
    LoadingComponent,
    AddUserDialogComponent,
    ConfirmUserComponent,
    QrCodesComponent,
    EditQrComponent,
    ViewQrComponent,
    DeleteQrComponent,
    AddQrComponent,
    SummaryComponent,
    AddComponent,
    EditRestaurantComponent,
    BrandingComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase, 'hungr-firebase-app'),
    AngularFirestoreModule,
    AngularFireAuthModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatSlideToggleModule,
    QRCodeModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    BrowserAnimationsModule,
    MatRadioModule,
    AngularFireStorageModule,
    NgxColorsModule
  ],
  providers: [FormDataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
