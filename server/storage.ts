import { 
  users, organizations, events, categories, albums, photos, orders,
  type User, type InsertUser,
  type Organization, type InsertOrganization,
  type Event, type InsertEvent,
  type Category, type InsertCategory,
  type Album, type InsertAlbum,
  type Photo, type InsertPhoto,
  type Order, type InsertOrder,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session store for authentication
  sessionStore: session.Store;

  // Organization methods
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<boolean>;

  // Event methods
  getEvents(): Promise<Event[]>;
  getEventsByOrganization(organizationId: number): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<boolean>;

  // Category methods
  getCategories(): Promise<Category[]>;
  getCategoriesByEvent(eventId: number): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<Category>): Promise<Category | undefined>;

  // Album methods
  getAlbums(): Promise<Album[]>;
  getAlbumsByCategory(categoryId: number): Promise<Album[]>;
  getAlbum(id: number): Promise<Album | undefined>;
  createAlbum(album: InsertAlbum): Promise<Album>;
  updateAlbum(id: number, data: Partial<Album>): Promise<Album | undefined>;
  updateAlbumCover(id: number, coverImage: string): Promise<Album | undefined>;
  deleteAlbum(id: number): Promise<boolean>;

  // Photo methods
  getPhotos(): Promise<Photo[]>;
  getPhotosByAlbum(albumId: number): Promise<Photo[]>;
  getPhoto(id: number): Promise<Photo | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: number): Promise<boolean>;
  updatePhotosPrice(photoIds: number[], price: number): Promise<Photo[]>;

  // Order methods
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private events: Map<number, Event>;
  private categories: Map<number, Category>;
  private albums: Map<number, Album>;
  private photos: Map<number, Photo>;
  private orders: Map<number, Order>;
  
  public sessionStore: session.Store;

  private userIdCounter: number;
  private orgIdCounter: number;
  private eventIdCounter: number;
  private categoryIdCounter: number;
  private albumIdCounter: number;
  private photoIdCounter: number;
  private orderIdCounter: number;

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.events = new Map();
    this.categories = new Map();
    this.albums = new Map();
    this.photos = new Map();
    this.orders = new Map();

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    this.userIdCounter = 1;
    this.orgIdCounter = 1;
    this.eventIdCounter = 1;
    this.categoryIdCounter = 1;
    this.albumIdCounter = 1;
    this.photoIdCounter = 1;
    this.orderIdCounter = 1;

    this.seedData();
  }

  // User methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.userIdCounter++,
      createdAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  // Organization methods
  async getOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const id = this.orgIdCounter++;
    const organization: Organization = {
      ...org,
      id,
      createdAt: new Date(),
    };
    this.organizations.set(id, organization);
    return organization;
  }
  
  async updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined> {
    const organization = this.organizations.get(id);
    if (!organization) return undefined;
    
    const updatedOrganization: Organization = {
      ...organization,
      ...data,
    };
    
    this.organizations.set(id, updatedOrganization);
    return updatedOrganization;
  }
  
  async deleteOrganization(id: number): Promise<boolean> {
    // 組織が存在するか確認
    if (!this.organizations.has(id)) return false;
    
    try {
      // 関連するイベントを取得
      const eventsArray = Array.from(this.events.values() || []);
      const relatedEvents = eventsArray.filter(
        (event) => event.organizationId === id
      );
      
      // 関連するカテゴリとアルバムをイベントごとに削除
      for (const event of relatedEvents) {
        // イベントに関連するカテゴリを取得
        const categoriesArray = Array.from(this.categories.values() || []);
        const relatedCategories = categoriesArray.filter(
          (category) => category.eventId === event.id
        );
        
        // カテゴリごとに関連アルバムと写真を削除
        for (const category of relatedCategories) {
          // カテゴリに関連するアルバムを取得
          const albumsArray = Array.from(this.albums.values() || []);
          const relatedAlbums = albumsArray.filter(
            (album) => album.categoryId === category.id
          );
          
          // アルバムごとに関連写真を削除
          for (const album of relatedAlbums) {
            // アルバムに関連する写真を削除
            const photosArray = Array.from(this.photos.values() || []);
            const photoIdsToDelete = photosArray
              .filter((photo) => photo.albumId === album.id)
              .map((photo) => photo.id);
            
            for (const photoId of photoIdsToDelete) {
              this.photos.delete(photoId);
            }
            
            // アルバムを削除
            this.albums.delete(album.id);
          }
          
          // カテゴリを削除
          this.categories.delete(category.id);
        }
        
        // イベントを削除
        this.events.delete(event.id);
      }
      
      // 最後に組織自体を削除
      return this.organizations.delete(id);
    } catch (error) {
      console.error("組織削除中にエラーが発生しました:", error);
      return false;
    }
  }

  // Event methods
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEventsByOrganization(organizationId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.organizationId === organizationId
    );
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const newEvent: Event = {
      ...event,
      id,
      createdAt: new Date(),
    };
    this.events.set(id, newEvent);
    return newEvent;
  }
  
  async updateEvent(event: Partial<Event> & { id: number }): Promise<Event> {
    const existingEvent = this.events.get(event.id);
    if (!existingEvent) {
      throw new Error(`イベントが見つかりません: ${event.id}`);
    }
    
    // 更新されたイベントを作成
    const updatedEvent: Event = {
      ...existingEvent,
      ...event,
      // createdAtは変更されない
      createdAt: existingEvent.createdAt,
    };
    
    // 更新されたイベントを保存
    this.events.set(event.id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    // イベントが存在するか確認
    if (!this.events.has(id)) return false;
    
    try {
      // 関連するカテゴリを取得
      const categoriesArray = Array.from(this.categories.values() || []);
      const relatedCategories = categoriesArray.filter(
        (category) => category.eventId === id
      );
      
      // カテゴリごとに関連アルバムと写真を削除
      for (const category of relatedCategories) {
        // カテゴリに関連するアルバムを取得
        const albumsArray = Array.from(this.albums.values() || []);
        const relatedAlbums = albumsArray.filter(
          (album) => album.categoryId === category.id
        );
        
        // アルバムごとに関連写真を削除
        for (const album of relatedAlbums) {
          // アルバムに関連する写真を取得して削除
          const photosArray = Array.from(this.photos.values() || []);
          const relatedPhotos = photosArray.filter(
            (photo) => photo.albumId === album.id
          );
          
          // 写真の削除
          for (const photo of relatedPhotos) {
            this.photos.delete(photo.id);
          }
          
          // アルバムの削除
          this.albums.delete(album.id);
        }
        
        // カテゴリの削除
        this.categories.delete(category.id);
      }
      
      // イベントの削除
      this.events.delete(id);
      return true;
    } catch (error) {
      console.error("イベント削除エラー:", error);
      return false;
    }
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoriesByEvent(eventId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.eventId === eventId
    );
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = {
      ...category,
      id,
      createdAt: new Date(),
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, data: Partial<Category>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory: Category = {
      ...category,
      ...data,
    };
    
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  // Album methods
  async getAlbums(): Promise<Album[]> {
    return Array.from(this.albums.values());
  }

  async getAlbumsByCategory(categoryId: number): Promise<Album[]> {
    return Array.from(this.albums.values()).filter(
      (album) => album.categoryId === categoryId
    );
  }

  async getAlbum(id: number): Promise<Album | undefined> {
    return this.albums.get(id);
  }

  async createAlbum(album: InsertAlbum): Promise<Album> {
    const id = this.albumIdCounter++;
    const newAlbum: Album = {
      ...album,
      id,
      isPublished: album.isPublished !== undefined ? album.isPublished : false, // 明示的に非公開をデフォルト値として設定
      createdAt: new Date(),
    };
    this.albums.set(id, newAlbum);
    return newAlbum;
  }

  async updateAlbum(id: number, data: Partial<Album>): Promise<Album | undefined> {
    const album = this.albums.get(id);
    if (!album) return undefined;
    
    const updatedAlbum: Album = {
      ...album,
      ...data,
    };
    
    this.albums.set(id, updatedAlbum);
    return updatedAlbum;
  }
  
  // 複数のアルバムの公開状態を一括で更新
  async bulkUpdateAlbumPublishStatus(albumIds: number[], isPublished: boolean): Promise<number> {
    let updatedCount = 0;
    
    for (const id of albumIds) {
      const album = this.albums.get(id);
      if (album) {
        const updatedAlbum: Album = {
          ...album,
          isPublished: isPublished
        };
        
        this.albums.set(id, updatedAlbum);
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  async updateAlbumCover(id: number, coverImage: string): Promise<Album | undefined> {
    const album = this.albums.get(id);
    if (!album) return undefined;
    
    album.coverImage = coverImage;
    this.albums.set(id, album);
    return album;
  }

  async deleteAlbum(id: number): Promise<boolean> {
    const album = this.albums.get(id);
    if (!album) return false;
    
    // Delete associated photos first
    const photos = Array.from(this.photos.values()).filter(
      (photo) => photo.albumId === id
    );
    
    for (const photo of photos) {
      this.photos.delete(photo.id);
    }
    
    return this.albums.delete(id);
  }

  // Photo methods
  async getPhotos(): Promise<Photo[]> {
    return Array.from(this.photos.values());
  }

  async getPhotosByAlbum(albumId: number): Promise<Photo[]> {
    return Array.from(this.photos.values()).filter(
      (photo) => photo.albumId === albumId
    );
  }

  async getPhoto(id: number): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const id = this.photoIdCounter++;
    const newPhoto: Photo = {
      ...photo,
      id,
      createdAt: new Date(),
    };
    this.photos.set(id, newPhoto);
    return newPhoto;
  }

  async deletePhoto(id: number): Promise<boolean> {
    return this.photos.delete(id);
  }

  async updatePhotosPrice(photoIds: number[], price: number): Promise<Photo[]> {
    const updatedPhotos: Photo[] = [];
    
    for (const id of photoIds) {
      const photo = this.photos.get(id);
      if (photo) {
        const updatedPhoto: Photo = {
          ...photo,
          price,
        };
        this.photos.set(id, updatedPhoto);
        updatedPhotos.push(updatedPhoto);
      }
    }
    
    return updatedPhotos;
  }

  // Order methods
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    const user = this.users.get(userId);
    if (!user) return [];
    
    return Array.from(this.orders.values()).filter(
      order => order.customerEmail === user.username
    );
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const newOrder: Order = {
      ...order,
      id,
      createdAt: new Date(),
      status: order.status || "completed",
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  private seedData() {
    // Create admin user
    const admin: User = {
      id: this.userIdCounter++,
      username: "yuhki.90884@gmail.com",
      displayName: "管理者",
      password: "2532af2b610e1995a0d3a9fcccc750145e51fe9d63bfade1dec9c5947da14cb6f71718a08b58eaac446739c4cd74d3307a7815f7e89e4f30e500fe2ab293ebbf.fce6b1bea7be314b298b1d0daa415c67",
      isAdmin: true,
      createdAt: new Date(),
    };
    this.users.set(admin.id, admin);

    // Create test organization
    const org: Organization = {
      id: this.orgIdCounter++,
      name: "東京フォトクラブ",
      description: "東京を拠点とする写真愛好家のコミュニティです。",
      bannerImage: "/uploads/banners/tokyo-photo-club.jpg",
      createdAt: new Date(),
    };
    this.organizations.set(org.id, org);
  }
}

export const storage = new MemStorage();