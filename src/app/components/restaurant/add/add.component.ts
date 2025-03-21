import { Component, OnInit } from '@angular/core';
import { Menu } from '../../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { ConfigService } from '../../../config.service';
import { Restaurant } from '../../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { SuccessAddRestaurantDialogComponent } from './success-add-restaurant-dialog/success-add-restaurant-dialog.component';
@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss'
})
export class AddComponent implements OnInit{
  selectedMenu: Menu | undefined;
  newRestaurant: Restaurant = {} as Restaurant;
  restaurant: any = {}; 
  menus: Menu[] = [];
  users: User[] = [];
  currentUser: User = {} as User;
  selectedContact: string = 'selected'; 
  selectedUser: User = {} as User;
  selectedNumberTable : string ='';
  restaurantStatus:boolean= false;
  user: any;
  OwnerID:string='';
  tableNums: number[] = [];

  selectedUserSurname:string='';
  selectedUserName:string='';
  isSaving:boolean=false;
  userChanged:boolean=false;
  constructor(private firestore: AngularFirestore, private configService: ConfigService, private dialog: MatDialog) {
    for (let i = 1; i <= this.configService.numberOfTables; i++) {
      this.tableNums.push(i);
    }
  }
  ngOnInit() {
    this.selectedUser = null;
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    this.fetchMenus();
    this.fetchUsers();
  }

  private fetchMenus() {
    this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', this.OwnerID))
      .valueChanges()
      .subscribe(menus => {
        this.menus = menus;
      });
  }

  private fetchUsers() {
    this.firestore.collection<User>('users', ref => ref.where('parentId', 'in', [this.OwnerID, '']))
      .valueChanges()
      .subscribe(users => {
        this.users = users;
      });

    this.firestore.collection<User>('users', ref => ref.where('uid', '==', this.OwnerID))
      .valueChanges()
      .subscribe(users => {
        this.currentUser = users[0];
      });
  }


  selectMenu(menu: Menu) {
    this.selectedMenu = menu;
  }


  addRestaurant(){
    const menuID = this.selectedMenu ? this.selectedMenu.menuID : '';
    var holdID = '';
    
    if (this.userChanged){
      holdID = this.selectedUser.uid;
    }

    this.newRestaurant= {
      restaurantID: '1',
      city: this.restaurant.city,
      mainContactID: holdID,
      menuID: menuID,
      numberTables: this.selectedNumberTable,
      ownerID: this.currentUser.uid,
      province: this.restaurant.province,
      restaurantName:  this.restaurant.name,
      status: this.restaurantStatus,
      streetAdress: this.restaurant.street,
      zip: this.restaurant.zip
    };

    console.log(this.newRestaurant);
    this.firestore.collection('restuarants').add(this.newRestaurant)
      .then((data) => {
        this.newRestaurant= {
          restaurantID: data.id,
          city: this.restaurant.city,
          mainContactID: holdID,
          menuID: menuID,
          numberTables: this.selectedNumberTable,
          ownerID: this.currentUser.uid,
          province: this.restaurant.province,
          restaurantName:  this.restaurant.name,
          status: this.restaurantStatus,
          streetAdress: this.restaurant.street,
          zip: this.restaurant.zip
        };
        this.firestore.collection('restuarants').doc(data.id).update(this.newRestaurant);
        
      })
      .then(() => {
        this.dialog.open(SuccessAddRestaurantDialogComponent, {
          width: '400px',
          data: { message: 'Your new restaurant has been successfully created.',
            title:'Restaurant Added'
           }
        });
      })
      .catch(error => {
        console.error('Error adding restaurant: ', error);
      });
  }

  selectUser(user: User){
    this.selectedUser =  user;
    console.log(this.selectedUser);
    this.selectedUserName =user.firstName;
    this.selectedUserSurname = user.Surname;
    this.userChanged = true;
  }

  removeUser(){
    this.selectedUser =  null;
    this.selectedUserName = '';
    this.selectedUserSurname = '';
    this.userChanged = true;
  }
}
