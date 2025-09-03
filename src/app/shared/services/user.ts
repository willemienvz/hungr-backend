import { About } from "./about";

export type UserRole = 'admin' | 'editor' | 'viewer' | 'custom';

export interface UserPermissions {
    viewAnalytics: boolean;
    createMenus: boolean;
    editMenus: boolean;
    editRestaurants: boolean;
    addSpecials: boolean;
    editBranding: boolean;
    manageUsers: boolean;
}

export interface User {
    uid: string;
    firstName: string;
    Surname: string;
    cellphoneNumber: string;
    cardHolderName: string;
    cardNumber: string;
    cvv: number;
    expiryDate: string;
    accountType: string;
    subscriptionType: string;
    email: string;
    emailVerified: boolean;
    marketingConsent: boolean;
    tipsTutorials: boolean;
    userInsights: boolean;
    aboutUsDisplayed: boolean;
    parentId: string;
    about?: About; // Temporarily kept for backward compatibility during migration
    role?: UserRole;
    permissions?: UserPermissions;
    invitationAccepted?: boolean;
    invitationToken?: string;
    invitedAt?: Date;
    invitedBy?: string;
    assignedRestaurants?: string[]; // Array of restaurant IDs this user is assigned to
}