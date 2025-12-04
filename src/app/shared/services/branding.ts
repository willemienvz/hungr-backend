export interface Branding {
    parentID: string;
    backgroundColor: string;
    navBarColor: string;
    
    // Generic color properties
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    
    // Logo - Legacy field for backward compatibility
    imageUrl: string;
    
    // Media library integration
    logoMediaId?: string; // New field for media library reference
    logoMediaItem?: any; // Enhanced media data (MediaItem type)
    
    // Button styling
    primaryButtonTypeface: string;
    primaryButtonCase: string;
    primaryButtonMainColor: string;
    primaryButtonTextColor: string;
    
    secondaryButtonTypeface: string;
    secondaryButtonCase: string;
    secondaryButtonMainColor: string;
    secondaryButtonTextColor: string;
    
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