import { About } from "./about";

export interface User {
    uid: string;
    firstName:string;
    Surname:string;
    cellphoneNumber:string;
    cardHolderName:string;
    cardNumber:string;
    cvv:number;
    expiryDate:string;
    accountType:string;
    subscriptionType:string;
    email: string;
    emailVerified: boolean;
    marketingConsent:boolean;
    tipsTutorials:boolean;
    userInsights:boolean;
    aboutUsDisplayed:boolean;
    parentId:string;
    about: About;
 }