import { Component } from '@angular/core';
import { Menu } from '../../../shared/services/menu';
import { Restaurant } from '../../../shared/services/restaurant';
import { User } from '../../../shared/services/user';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ConfigService } from '../../../config.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuccessAddRestaurantDialogComponent } from '../add/success-add-restaurant-dialog/success-add-restaurant-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-edit-restaurant',
  templateUrl: './edit-restaurant.component.html',
  styleUrl: './edit-restaurant.component.scss'
})
export class EditRestaurantComponent {
  selectedMenu: string = '';
  selectedMenuID: string = '';
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
  currentRestaurantID:string='';
  currentRestaurant: Restaurant = {} as Restaurant;
  selectedUserSurname:string='';
  selectedUserName:string='';
  isSaving:boolean=false;
  userChanged:boolean=false;

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    this.route.queryParams.subscribe(params => {
      this.currentRestaurantID = params['id'];
     
    });
    this.fetchMenus();
    this.fetchUsers();
    
    this.fetchRestaurant(this.currentRestaurantID);
  }

  constructor(private dialog: MatDialog,private snackBar: MatSnackBar,private firestore: AngularFirestore, private configService: ConfigService,private route: ActivatedRoute) {
    for (let i = 1; i <= this.configService.numberOfTables; i++) {
      this.tableNums.push(i);
    }
  }

  private fetchMenus() {
    this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', this.OwnerID))
      .valueChanges()
      .subscribe(menus => {
        this.menus = menus;
      });
  }
  private fetchUser(id:string) {
    this.firestore.collection<User>('users', ref => ref.where('uid', '==', id))
      .valueChanges()
      .subscribe(users => {
        this.selectedUserName = users[0].firstName;
        this.selectedUserSurname = users[0].Surname;
      });
  }

  private fetchUsers() {
    this.firestore.collection<User>('users', ref => ref.where('parentId', 'in', [this.OwnerID, '']))
      .valueChanges()
      .subscribe(users => {
        console.log('w',users);
        this.users = users;
      });

    this.firestore.collection<User>('users', ref => ref.where('uid', '==', this.OwnerID))
      .valueChanges()
      .subscribe(users => {
        this.currentUser = users[0];
      });
  }

  private fetchRestaurant(id:string){
    this.firestore.collection<Restaurant>('restuarants', ref => ref.where('restaurantID', '==', this.currentRestaurantID))
    .valueChanges()
    .subscribe(restaurant => {
      this.currentRestaurant =restaurant[0];
      this.restaurant.city = this.currentRestaurant.city;
      this.selectedNumberTable  = this.currentRestaurant.numberTables;
      this.restaurant.province  = this.currentRestaurant.province;
      this.restaurant.name  = this.currentRestaurant.restaurantName;
      this.restaurantStatus  = this.currentRestaurant.status;
      this.restaurant.street  = this.currentRestaurant.streetAdress;
      this.restaurant.zip = this.currentRestaurant.zip;
      this.selectedMenu = this.currentRestaurant.menuID;
      this.fetchUser(this.currentRestaurant.mainContactID);
    });
  }

  editRestaurant(){
    this.isSaving = false;
    const menuID = this.selectedMenu ? this.selectedMenu : '';
    var holdID = '';
   
    if (this.userChanged){
      holdID = this.selectedUser.uid;
    }else{
      holdID = this.currentRestaurant.mainContactID;
    }

   var tempRestaurant= {
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

    console.log(tempRestaurant);
    this.firestore.collection('restuarants').doc(this.currentRestaurantID).update(tempRestaurant)
      .then(() => {
        this.dialog.open(SuccessAddRestaurantDialogComponent, {
          width: '400px',
          data: { message: 'Your restaurant has been updated.',
            title:'Restaurant Edited'
           }
        });
      })
      .catch(error => {
        console.error('Error updating restaurant:', error);
        this.snackBar.open('Failed to update restaurant. Please try again.', 'Close', {
          duration: 3000,
        });
      });
  }

  selectMenu(menuID: string) {
    this.selectedMenuID = menuID;
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
