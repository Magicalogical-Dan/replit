import { useState, useEffect } from 'react';

const DB_NAME = 'ThoughtJournalDB';
const OBJECT_STORE_NAME = 'media';
const DB_VERSION = 1;

type UseIndexedDBReturnType = {
  db: IDBDatabase | null;
  error: Error | null;
  saveBlob: (blob: Blob) => Promise<string>;
  getBlob: (url: string) => Promise<Blob | null>;
  deleteBlob: (url: string) => Promise<boolean>;
  getAllBlobUrls: () => Promise<string[]>;
  isLoading: boolean;
};

export function useIndexedDB(): UseIndexedDBReturnType {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initDB = async () => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
          const target = event.target as IDBOpenDBRequest;
          setError(new Error(`Database error: ${target.error?.message}`));
          setIsLoading(false);
        };
        
        request.onsuccess = (event) => {
          const target = event.target as IDBOpenDBRequest;
          setDb(target.result);
          setIsLoading(false);
        };
        
        request.onupgradeneeded = (event) => {
          const target = event.target as IDBOpenDBRequest;
          const db = target.result;
          
          // Create an object store for media blobs
          if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown IndexedDB error'));
        setIsLoading(false);
      }
    };
    
    initDB();
    
    return () => {
      if (db) {
        db.close();
      }
    };
  }, []);

  // Save a blob to IndexedDB and return a pseudo-URL (or a real URL if using native URL API)
  const saveBlob = async (blob: Blob): Promise<string> => {
    console.log("saveBlob called with blob:", blob.size, "bytes, type:", blob.type);
    
    if (!db) {
      console.error("IndexedDB not initialized");
      throw new Error('Database not initialized');
    }
    
    // First try to create a real object URL (better browser compatibility)
    try {
      const browserUrl = URL.createObjectURL(blob);
      console.log("Created browser URL:", browserUrl);
      
      // Try to also store in IndexedDB as backup
      try {
        // Generate a unique ID for the blob
        const id = `blob_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const localUrl = `blob:${id}`;
        
        // Start a transaction
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        
        // Store the mapping of the browserUrl to our local ID
        console.log("Storing blob in IndexedDB with ID:", id);
        const storeObject = { id, blob, url: localUrl, browserUrl };
        store.add(storeObject);
      } catch (dbErr) {
        console.warn("Failed to save blob to IndexedDB:", dbErr);
        // Continue using browser URL even if IndexedDB fails
      }
      
      // Return the browser URL either way
      return browserUrl;
    } catch (urlErr) {
      console.error("Failed to create browser URL:", urlErr);
      
      // Fall back to our custom pseudo-URL approach
      return new Promise((resolve, reject) => {
        try {
          // Generate a unique ID for the blob
          const id = `blob_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const url = `blob:${id}`;
          
          // Start a transaction
          const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
          const store = transaction.objectStore(OBJECT_STORE_NAME);
          
          console.log("Fallback: Storing blob in IndexedDB with ID:", id);
          // Add the blob to the store
          const request = store.add({ id, blob, url });
          
          request.onsuccess = () => {
            console.log("Successfully saved blob to IndexedDB with URL:", url);
            resolve(url);
          };
          
          request.onerror = (event) => {
            const target = event.target as IDBRequest;
            const errorMsg = `Failed to save blob: ${target.error?.message}`;
            console.error(errorMsg);
            reject(new Error(errorMsg));
          };
        } catch (err) {
          console.error("Critical error in saveBlob:", err);
          reject(err);
        }
      });
    }
  };

  // Get a blob by its URL
  const getBlob = async (url: string): Promise<Blob | null> => {
    if (!db) throw new Error('Database not initialized');
    
    // If it's a full browser URL (not our custom blob: prefix scheme)
    if (url.startsWith('blob:http')) {
      console.log('Trying to fetch from browser URL:', url);
      try {
        // Try to fetch it directly as a browser URL
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          console.log(`Successfully retrieved blob from browser URL: ${url}, size: ${blob.size} bytes`);
          return blob;
        }
      } catch (err) {
        console.warn(`Failed to fetch from browser URL: ${url}`, err);
        // Fall through to try IndexedDB
      }
    }
    
    // If it's not a blob: URL at all, we can't handle it
    if (!url.includes('blob:')) {
      console.warn('URL is not a blob URL:', url);
      return null;
    }
    
    // For our custom blob:id URLs
    let id = url;
    if (url.startsWith('blob:')) {
      id = url.substring(5); // Remove 'blob:' prefix
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        
        // Try to find by id first (our primary key)
        const request = store.get(id);
        
        request.onsuccess = (event) => {
          const target = event.target as IDBRequest;
          if (target.result) {
            console.log(`Found blob in IndexedDB with ID: ${id}, size: ${target.result.blob.size} bytes`);
            resolve(target.result.blob);
          } else {
            // If not found by ID, try to find by browserUrl
            console.log('Blob not found by ID, checking all records for matching browserUrl');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = (getAllEvent) => {
              const getAllTarget = getAllEvent.target as IDBRequest;
              const items = getAllTarget.result || [];
              
              for (const item of items) {
                if (item.browserUrl === url) {
                  console.log(`Found blob by browserUrl: ${url}, size: ${item.blob.size} bytes`);
                  resolve(item.blob);
                  return;
                }
              }
              
              console.warn(`Blob not found for URL: ${url}`);
              resolve(null);
            };
            
            getAllRequest.onerror = (getAllError) => {
              const getAllErrorTarget = getAllError.target as IDBRequest;
              console.error(`Failed to get all blobs: ${getAllErrorTarget.error?.message}`);
              resolve(null);
            };
          }
        };
        
        request.onerror = (event) => {
          const target = event.target as IDBRequest;
          console.error(`Failed to get blob: ${target.error?.message}`);
          reject(new Error(`Failed to get blob: ${target.error?.message}`));
        };
      } catch (err) {
        console.error('Error in getBlob:', err);
        reject(err);
      }
    });
  };

  // Delete a blob by its URL
  const deleteBlob = async (url: string): Promise<boolean> => {
    if (!db) throw new Error('Database not initialized');
    
    // For browser URLs, attempt to revoke the object URL
    if (url.startsWith('blob:http')) {
      try {
        console.log('Revoking browser URL:', url);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('Error revoking browser URL:', err);
        // Continue with deletion attempt in IndexedDB
      }
    }
    
    // If it's not a blob URL at all, we can't handle it
    if (!url.includes('blob:')) {
      console.warn('URL is not a blob URL and cannot be deleted:', url);
      return false;
    }
    
    // For our custom blob:id URLs
    let id = url;
    if (url.startsWith('blob:')) {
      id = url.substring(5); // Remove 'blob:' prefix
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        
        // Try to delete by ID first (our primary key)
        const getRequest = store.get(id);
        
        getRequest.onsuccess = (event) => {
          const target = event.target as IDBRequest;
          if (target.result) {
            // Delete the found record
            console.log(`Deleting blob with ID: ${id}`);
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => {
              console.log(`Successfully deleted blob with ID: ${id}`);
              resolve(true);
            };
            
            deleteRequest.onerror = (deleteEvent) => {
              const deleteTarget = deleteEvent.target as IDBRequest;
              console.error(`Failed to delete blob: ${deleteTarget.error?.message}`);
              reject(new Error(`Failed to delete blob: ${deleteTarget.error?.message}`));
            };
          } else {
            // If not found by ID, try to find and delete by browserUrl
            console.log('Blob not found by ID, checking all records for matching browserUrl');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = (getAllEvent) => {
              const getAllTarget = getAllEvent.target as IDBRequest;
              const items = getAllTarget.result || [];
              
              for (const item of items) {
                if (item.browserUrl === url) {
                  console.log(`Found blob by browserUrl: ${url}, deleting ID: ${item.id}`);
                  const deleteByBrowserUrlRequest = store.delete(item.id);
                  
                  deleteByBrowserUrlRequest.onsuccess = () => {
                    console.log(`Successfully deleted blob with ID: ${item.id} by browserUrl: ${url}`);
                    resolve(true);
                    return;
                  };
                  
                  deleteByBrowserUrlRequest.onerror = (deleteError) => {
                    const deleteErrorTarget = deleteError.target as IDBRequest;
                    console.error(`Failed to delete blob by browserUrl: ${deleteErrorTarget.error?.message}`);
                    reject(new Error(`Failed to delete blob: ${deleteErrorTarget.error?.message}`));
                    return;
                  };
                  
                  // Break out of the loop since we found and are attempting to delete the item
                  return;
                }
              }
              
              console.warn(`No blob found for deletion with URL: ${url}`);
              resolve(false);
            };
            
            getAllRequest.onerror = (getAllError) => {
              const getAllErrorTarget = getAllError.target as IDBRequest;
              console.error(`Failed to get all blobs for deletion: ${getAllErrorTarget.error?.message}`);
              reject(new Error(`Failed to get all blobs for deletion: ${getAllErrorTarget.error?.message}`));
            };
          }
        };
        
        getRequest.onerror = (event) => {
          const target = event.target as IDBRequest;
          console.error(`Failed to retrieve blob for deletion: ${target.error?.message}`);
          reject(new Error(`Failed to retrieve blob for deletion: ${target.error?.message}`));
        };
      } catch (err) {
        console.error('Error in deleteBlob:', err);
        reject(err);
      }
    });
  };

  // Get all blob URLs
  const getAllBlobUrls = async (): Promise<string[]> => {
    if (!db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = (event) => {
          const target = event.target as IDBRequest;
          const items = target.result || [];
          
          // Collect both our custom URLs and browser URLs
          const allUrls: string[] = [];
          
          for (const item of items) {
            // Add the local URL (our custom format)
            if (item.url) {
              allUrls.push(item.url);
            }
            
            // Also add the browser URL if it exists and is different
            if (item.browserUrl && !allUrls.includes(item.browserUrl)) {
              allUrls.push(item.browserUrl);
            }
          }
          
          console.log(`Retrieved ${allUrls.length} blob URLs from IndexedDB`);
          resolve(allUrls);
        };
        
        request.onerror = (event) => {
          const target = event.target as IDBRequest;
          console.error(`Failed to get all blobs: ${target.error?.message}`);
          reject(new Error(`Failed to get all blobs: ${target.error?.message}`));
        };
      } catch (err) {
        console.error('Error in getAllBlobUrls:', err);
        reject(err);
      }
    });
  };

  return {
    db,
    error,
    saveBlob,
    getBlob,
    deleteBlob,
    getAllBlobUrls,
    isLoading,
  };
}
