import { Category } from "./category";
import { MenuItem } from "./menu-item";

export interface Menu {
    id: string;
    menuName:string;
    OwnerID:string;
    Status:string;
    qrAssigned:boolean;
    qrUrl:string;
    menuID:string;
    isDraft:boolean;
    categories: Category[];
    items: MenuItem[];
    location:string;
 }