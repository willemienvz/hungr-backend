export interface About {
    restaurantId: string; // ID of the restaurant this about page belongs to
    aboutText: string;
    additionalImageUrls: string[]; // Changed from additionalImageUrl to support multiple images
    businessHours: string;
    cellphone: string;
    email: string;
    isBusinessHoursVisible: boolean;
    isContactDetailsVisible: boolean;
    mainImageUrl: string;
}