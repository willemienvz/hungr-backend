import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
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
import { UserFormComponent } from './components/manage-users/user-form/user-form.component';
import { ConfirmUserComponent } from './components/manage-users/confirm-user/confirm-user.component';
import { QrCodesComponent } from './components/qr-codes/qr-codes.component';
import { EditQrComponent } from './components/qr-codes/edit-qr/edit-qr.component';
import { ViewQrComponent } from './components/qr-codes/view-qr/view-qr.component';
import { DeleteQrComponent } from './components/qr-codes/delete-qr/delete-qr.component';
import { AddQrComponent } from './components/qr-codes/add-qr/add-qr.component';
import { QRCodeModule } from 'angularx-qrcode';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SummaryComponent } from './components/restaurant/summary/summary.component';
import { RestaurantFormComponent } from './components/restaurant/restaurant-form/restaurant-form.component';
import { AddRestaurantComponent } from './components/restaurant/add-restaurant/add-restaurant.component';
import { BrandingComponent } from './components/settings/branding/branding.component';
import { NgxColorsModule } from 'ngx-colors';
import { MenusComponent } from './components/menus/menus.component';
import { MatIconModule } from '@angular/material/icon';
import { AddMenuComponent } from './components/menus/add-menu/add-menu.component';
import { ProgressBarComponent } from './components/shared/progress-bar/progress-bar.component';
import { EditMenuComponent } from './components/menus/edit-menu/edit-menu.component';
import { AboutComponent } from './components/settings/about/about.component';
import { AddSpecialComponent } from './components/specials/add-special/add-special.component';
import { MatChipsModule } from '@angular/material/chips';
import { SpecialsLandingComponent } from './components/specials/specials-landing/specials-landing.component';
import { EditSpecialComponent } from './components/specials/edit-special/edit-special.component';
import { ToastrModule } from 'ngx-toastr';
import { HelpComponent } from './components/help/help/help.component';
import { TutorialsComponent } from './components/help/tutorials/tutorials.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { RestaurantComponent } from './components/restaurant/restaurant.component';
import { ViewingtimegraphComponent } from './components/graphs/viewingtimegraph/viewingtimegraph.component';
import { VisitorDashboardComponent } from './components/dashboard/visitor-dashboard/visitor-dashboard.component';
import { FusionChartsModule } from 'angular-fusioncharts';
import { NgxEchartsModule } from 'ngx-echarts';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TestAuthComponent } from './components/test-auth/test-auth.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { MenuInsightsComponent } from './components/dashboard/menu-insights/menu-insights.component';
import { SalesInsightsComponent } from './components/dashboard/sales-insights/sales-insights.component';
import { ConfirmDeleteDialogComponent } from './components/restaurant/confirm-delete-dialog/confirm-delete-dialog.component';
import { SuccessAddRestaurantDialogComponent } from './components/restaurant/add/success-add-restaurant-dialog/success-add-restaurant-dialog.component';
import { MatTabsModule } from '@angular/material/tabs';
import { ViewComponent } from './components/restaurant/view/view.component';
import { ResetSuccessComponent } from './components/forgot-password/reset-success/reset-success.component';
import { ConfirmEmailComponent } from './components/sign-up/confirm-email/confirm-email.component';
import { NewPasswordComponent } from './components/forgot-password/new-password/new-password.component';
import { CancelPaymentComponent } from './components/cancel-payment/cancel-payment.component';
import { ActionLandingComponent } from './components/action-landing/action-landing.component';
import { SaveProgressDialogComponent } from './components/save-progress-dialog/save-progress-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { UnsavedChangesDialogComponent } from './components/unsaved-changes-dialog/unsaved-changes-dialog.component';
import { DeleteConfirmationModalComponent } from './components/shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { ViewUsersComponent } from './components/manage-users/view-users/view-users.component';
import { PermissionsManagerComponent } from './components/manage-users/permissions-manager/permissions-manager.component';
import { MenuFormStepComponent } from './components/shared/menu-form-step/menu-form-step.component';
import { CategoryManagementComponent } from './components/shared/category-management/category-management.component';
import { MenuItemFormComponent } from './components/shared/menu-item-form/menu-item-form.component';
import { StepNavigationComponent } from './components/shared/step-navigation/step-navigation.component';
import { SvgIconComponent } from './components/shared/svg-icon/svg-icon.component';
import { MenuItemSelectionComponent } from './components/shared/menu-item-selection/menu-item-selection.component';
import { StepHeaderComponent } from './components/shared/step-header/step-header.component';
import { MenuItemDetailComponent } from './components/shared/menu-item-detail/menu-item-detail.component';
import { MenuItemPairingComponent } from './components/shared/menu-item-pairing/menu-item-pairing.component';
import { SideDetailComponent } from './components/shared/side-detail/side-detail.component';
import { AllergenDetailComponent } from './components/shared/allergen-detail/allergen-detail.component';
import { ImageUploadModalComponent } from './components/shared/image-upload-modal/image-upload-modal.component';
import { MediaUploadModalComponent } from './shared/components/media-upload-modal/media-upload-modal.component';
import { MediaPreviewDialogComponent } from './shared/components/media-preview-dialog/media-preview-dialog.component';
import { MenuCompletionSuccessComponent } from './components/shared/menu-completion-success/menu-completion-success.component';
import { PriceInputComponent } from './shared/components/price-input/price-input.component';
import { SpecialsTableComponent } from './components/specials/shared/specials-table/specials-table.component';
import { ViewSpecialDialogComponent } from './components/specials/shared/view-special-dialog/view-special-dialog.component';
import { Step1SpecialBasicsComponent } from './components/specials/shared/special-form-steps/step1-special-basics/step1-special-basics.component';
import { Step2DaysTimesComponent } from './components/specials/shared/special-form-steps/step2-days-times/step2-days-times.component';
import { Step3SpecialDetailsComponent } from './components/specials/shared/special-form-steps/step3-special-details/step3-special-details.component';
import { Step4AddMediaComponent } from './components/specials/shared/special-form-steps/step4-add-media/step4-add-media.component';
import { Step5OverviewComponent } from './components/specials/shared/special-form-steps/step5-overview/step5-overview.component';
import { SpecialSummaryComponent } from './components/specials/shared/special-summary/special-summary.component';
import { MenuDetailsModalComponent } from './components/shared/menu-details-modal/menu-details-modal.component';
import { ContentBlockComponent } from './components/shared/content-block/content-block.component';
import { ButtonComponent } from './components/shared/button/button.component';
import { FormInputComponent } from './components/shared/form-input/form-input.component';
import { FormSelectComponent } from './components/shared/form-select/form-select.component';
import { FormTextareaComponent } from './components/shared/form-textarea/form-textarea.component';
import { DataTableComponent } from './components/shared/data-table/data-table.component';
import { ActionButtonComponent } from './components/shared/action-button/action-button.component';
import { StatusBadgeComponent } from './components/shared/status-badge/status-badge.component';
import { StatsCardComponent } from './components/shared/stats-card/stats-card.component';
import { StatsInsightCardComponent } from './components/shared/stats-insight-card/stats-insight-card.component';
import { PageLayoutComponent } from './components/shared/page-layout/page-layout.component';
import { MediaLibraryComponent } from './components/media-library/media-library.component';
import { FileSizePipe } from './shared/pipes/file-size.pipe';
import { ReviewsComponent } from './components/reviews/reviews.component';
import { PermissionService } from './shared/services/permission.service';

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
    UserFormComponent,
    ConfirmUserComponent,
    QrCodesComponent,
    EditQrComponent,
    ViewQrComponent,
    DeleteQrComponent,
    AddQrComponent,
    SummaryComponent,
    RestaurantFormComponent,
    AddRestaurantComponent,
    BrandingComponent,
    MenusComponent,
    AddMenuComponent,
    ProgressBarComponent,
    EditMenuComponent,
    AboutComponent,
    AddSpecialComponent,
    SpecialsLandingComponent,
    EditSpecialComponent,
    HelpComponent,
    TutorialsComponent,
    RestaurantComponent,
    ViewingtimegraphComponent,
    VisitorDashboardComponent,
    MenuInsightsComponent,
    SalesInsightsComponent,
    ConfirmDeleteDialogComponent,
    SuccessAddRestaurantDialogComponent,
    ViewComponent,
    ResetSuccessComponent,
    ConfirmEmailComponent,
    NewPasswordComponent,
    CancelPaymentComponent,
    ActionLandingComponent,
    SaveProgressDialogComponent,
    UnsavedChangesDialogComponent,
    DeleteConfirmationModalComponent,
    ViewUsersComponent,
    PermissionsManagerComponent,
    MenuFormStepComponent,
    CategoryManagementComponent,
    MenuItemFormComponent,
    StepNavigationComponent,
    SvgIconComponent,
    MenuItemSelectionComponent,
    StepHeaderComponent,
    MenuItemDetailComponent,
    MenuItemPairingComponent,
    SideDetailComponent,
    AllergenDetailComponent,
    ImageUploadModalComponent,
    MenuCompletionSuccessComponent,
    PriceInputComponent,
    TestAuthComponent,
    SpecialsTableComponent,
    ViewSpecialDialogComponent,
    Step1SpecialBasicsComponent,
    Step2DaysTimesComponent,
    Step3SpecialDetailsComponent,
    Step4AddMediaComponent,
    Step5OverviewComponent,
    SpecialSummaryComponent,
    MenuDetailsModalComponent,
    ContentBlockComponent,
    ButtonComponent,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
    DataTableComponent,
    ActionButtonComponent,
    StatusBadgeComponent,
    StatsCardComponent,
    StatsInsightCardComponent,
    PageLayoutComponent,
    MediaLibraryComponent,
    FileSizePipe,
    MediaUploadModalComponent,
    MediaPreviewDialogComponent,
    ReviewsComponent,
  ],
  imports: [
    BrowserModule,
    FusionChartsModule,
    AppRoutingModule,
    RouterModule,
    AngularFireModule.initializeApp(environment.firebase, 'hungr-firebase-app'),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireStorageModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatSlideToggleModule,
    QRCodeModule,
    CommonModule,
    MatDialogModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    BrowserAnimationsModule,
    NgxColorsModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatButtonModule,
    MatMenuModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DragDropModule,
    ColorPickerModule,
    MatTooltipModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
    ToastrModule.forRoot(),
  ],
  providers: [FormDataService, DatePipe, PermissionService],
  bootstrap: [AppComponent],
})
export class AppModule { }
