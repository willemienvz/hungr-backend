export interface Branding {
    parentID: string;
    backgroundColor: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    
    // Logo
    imageUrl: string;
    
    // Text styling
    mainHeadingColor: string;
    mainHeadingTypeface: string;
    mainHeadingCase: string;
    mainHeadingSize: string;
    
    subHeadingColor: string;
    subHeadingTypeface: string;
    subHeadingCase: string;
    subHeadingSize: string;
    
    bodyColor: string;
    bodyTypeface: string;
    bodyCase: string;
    bodySize: string;
    
    brandingID?: string;
    
    // Preview mode support
    isPreview?: boolean;
    originalDocId?: string;
    previewTimestamp?: number;
}