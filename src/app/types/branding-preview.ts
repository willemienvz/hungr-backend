export interface BrandingPreviewMessage {
  type: 'BRANDING_UPDATE';
  payload: {
    property: string;
    value: string;
  };
}

export type BrandingProperty = 
  | 'backgroundColor'
  | 'primaryColor'
  | 'secondaryColor'
  | 'accentColor'
  | 'mainHeadingColor'
  | 'subHeadingColor'
  | 'bodyColor'
  | 'mainHeadingTypeface'
  | 'subHeadingTypeface'
  | 'bodyTypeface'
  | 'mainHeadingCase'
  | 'subHeadingCase'
  | 'bodyCase';

export interface BrandingPreviewState {
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  mainHeadingColor: string;
  subHeadingColor: string;
  bodyColor: string;
  mainHeadingTypeface: string;
  subHeadingTypeface: string;
  bodyTypeface: string;
  mainHeadingCase: string;
  subHeadingCase: string;
  bodyCase: string;
} 