export interface Special {
    specialID: string;
    menuName:string;
    OwnerID:string;
    dateFrom:string;
    dateTo:boolean;
    featureSpecialUnder:number;
    menu:string;
    isDraft:boolean;
    addedItems: { name: string; amount: number }[];
    selectedDays: string[];
    specialTitle:string;
    timeFrom:string;
    timeTo:string;
    typeSpecial:number;
    typeSpecialDetails:string;
    imageUrl:string;
 }

 export function isSpecial(data: any): data is Special {
    return (
      typeof data.menu === 'string' &&
      typeof data.specialTitle === 'string' &&
      typeof data.dateFrom === 'string' &&
      typeof data.dateTo === 'string' &&
      typeof data.typeSpecial === 'string' &&
      typeof data.timeFrom === 'string' &&
      typeof data.timeTo === 'string' &&
      Array.isArray(data.addedItems) &&
      Array.isArray(data.selectedDays) &&
      typeof data.imageUrl === 'string' &&
      typeof data.OwnerID === 'string'
    );
  }