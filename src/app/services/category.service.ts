import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category } from '../types/special';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {

    constructor(private firestore: AngularFirestore) { }

    /**
     * Get all categories from the database
     */
    getAllCategories(): Observable<Category[]> {
        return this.firestore
            .collection('categories')
            .valueChanges()
            .pipe(
                map((categories: any[]) =>
                    categories.map(cat => ({
                        id: cat.id || cat.name,
                        name: cat.name,
                        description: cat.description,
                        itemCount: cat.itemCount || 0
                    }))
                )
            );
    }

    /**
     * Get categories by their IDs
     */
    getCategoriesByIds(categoryIds: string[]): Observable<Category[]> {
        if (!categoryIds || categoryIds.length === 0) {
            console.log('CategoryService: No category IDs provided, returning empty array');
            return new Observable(observer => {
                observer.next([]);
                observer.complete();
            });
        }

        // Firestore 'in' query has a limit of 10 items
        if (categoryIds.length > 10) {
            console.warn(`CategoryService: Too many category IDs (${categoryIds.length}), limiting to 10`);
            categoryIds = categoryIds.slice(0, 10);
        }

        console.log('CategoryService: Fetching categories for IDs:', categoryIds);

        return this.firestore
            .collection('categories', ref => ref.where('__name__', 'in', categoryIds))
            .valueChanges()
            .pipe(
                map((categories: any[]) => {
                    console.log(`CategoryService: Found ${categories.length} categories`);
                    return categories.map(cat => ({
                        id: cat.id || cat.name,
                        name: cat.name,
                        description: cat.description,
                        itemCount: cat.itemCount || 0
                    }));
                })
            );
    }

    /**
     * Extract categories from menu items (fallback method)
     */
    extractCategoriesFromMenuItems(menuItems: any[]): Category[] {
        const categoryMap = new Map<string, { name: string; count: number }>();

        menuItems.forEach(item => {
            const categoryId = item.categoryId || item.category;
            const categoryName = item.categoryName || item.category || 'Uncategorized';

            if (categoryId) {
                const existing = categoryMap.get(categoryId);
                if (existing) {
                    existing.count++;
                } else {
                    categoryMap.set(categoryId, { name: categoryName, count: 1 });
                }
            }
        });

        return Array.from(categoryMap.entries()).map(([id, data]) => ({
            id,
            name: data.name,
            itemCount: data.count
        }));
    }
}
