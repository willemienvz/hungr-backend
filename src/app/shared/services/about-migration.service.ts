import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { About } from './about';
import { Restaurant } from './restaurant';
import { User } from './user';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AboutMigrationService {

  constructor(
    private firestore: AngularFirestore,
    private toastr: ToastrService
  ) {}

  /**
   * Migrate existing about data from user documents to restaurant-specific aboutPages collection
   * This should be run once to move existing data to the new structure
   */
  async migrateAboutData(): Promise<void> {
    try {
      this.toastr.info('Starting about data migration...');
      
      // Get all users with about data
      const usersSnapshot = await this.firestore.collection('users').get().toPromise();
      const migratedCount = 0;
      const errors: string[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as User;
        
        // Check if user has about data
        if (userData.about) {
          try {
            // Find restaurants owned by this user
            const restaurantsSnapshot = await this.firestore
              .collection('restaurants', ref => ref.where('ownerID', '==', userData.uid))
              .get()
              .toPromise();

            if (!restaurantsSnapshot.empty) {
              // Migrate about data to each restaurant owned by this user
              for (const restaurantDoc of restaurantsSnapshot.docs) {
                const restaurantData = restaurantDoc.data() as Restaurant;
                
                const aboutData: About = {
                  restaurantId: restaurantData.restaurantID,
                  aboutText: userData.about.aboutText || '',
                  businessHours: userData.about.businessHours || '',
                  email: userData.about.email || '',
                  cellphone: userData.about.cellphone || '',
                  isBusinessHoursVisible: userData.about.isBusinessHoursVisible ?? true,
                  isContactDetailsVisible: userData.about.isContactDetailsVisible ?? true,
                  mainImageUrl: userData.about.mainImageUrl || '',
                  additionalImageUrls: userData.about.additionalImageUrl ? [userData.about.additionalImageUrl] : [] // Convert single image to array
                };

                // Save to new aboutPages collection
                await this.firestore
                  .collection('aboutPages')
                  .doc(restaurantData.restaurantID)
                  .set(aboutData);

                migratedCount++;
                console.log(`Migrated about data for restaurant: ${restaurantData.restaurantName}`);
              }
            } else {
              console.log(`No restaurants found for user: ${userData.uid}`);
            }
          } catch (error) {
            const errorMsg = `Failed to migrate about data for user ${userData.uid}: ${error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      if (errors.length > 0) {
        this.toastr.warning(`Migration completed with ${errors.length} errors. Check console for details.`);
        console.error('Migration errors:', errors);
      } else {
        this.toastr.success(`Successfully migrated about data for ${migratedCount} restaurants!`);
      }

    } catch (error) {
      console.error('Migration failed:', error);
      this.toastr.error('About data migration failed. Check console for details.');
      throw error;
    }
  }

  /**
   * Check if migration is needed by looking for users with about data
   */
  async checkMigrationNeeded(): Promise<boolean> {
    try {
      const usersSnapshot = await this.firestore.collection('users').get().toPromise();
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as User;
        if (userData.about) {
          return true; // Migration is needed
        }
      }
      
      return false; // No migration needed
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Clean up old about data from user documents after successful migration
   * WARNING: This will permanently remove the old about data
   */
  async cleanupOldAboutData(): Promise<void> {
    try {
      this.toastr.warning('Cleaning up old about data from user documents...');
      
      const usersSnapshot = await this.firestore.collection('users').get().toPromise();
      let cleanedCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as User;
        
        if (userData.about) {
          // Remove about field from user document
          await this.firestore
            .collection('users')
            .doc(userData.uid)
            .update({
              about: null
            });
          
          cleanedCount++;
        }
      }

      this.toastr.success(`Cleaned up about data from ${cleanedCount} user documents!`);
      
    } catch (error) {
      console.error('Cleanup failed:', error);
      this.toastr.error('Cleanup failed. Check console for details.');
      throw error;
    }
  }
}
