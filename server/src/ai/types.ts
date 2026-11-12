// AI Layer Interface for picPac.by
// PhotoAnalyzer contract as specified in architecture requirements

export interface PhotoDescriptor {
  id: string;
  url?: string;
  filePath?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  phash?: string;
}

export interface QualityScoreResult {
  score: number; // 0 to 100
  isBlurry: boolean;
  blurVariance: number;
  isLowResolution: boolean;
  warnings: string[];
}

export interface DuplicateGroup {
  originalPhotoId: string;
  duplicatePhotoIds: string[];
  similarityScore: number; // 0.0 to 1.0
  recommendation: string;
}

export interface BestPhotosResult {
  selectedPhotoIds: string[];
  rationale: string;
}

export interface ProductLayoutSlot {
  slotIndex: number;
  pageNumber?: number;
  suggestedPhotoId: string;
  cropBox?: { x: number; y: number; width: number; height: number };
  caption?: string;
}

export interface LayoutSuggestionResult {
  productId: string;
  layoutName: string;
  slots: ProductLayoutSlot[];
  tips: string[];
}

export interface PhotoIssueDescription {
  photoId: string;
  issueType: 'blur' | 'low_res' | 'duplicate' | 'aspect_ratio' | 'lighting' | 'other';
  severity: 'warning' | 'error';
  titleRu: string;
  descriptionRu: string;
  recommendedActionRu: string;
}

export interface PhotoAnalyzer {
  scoreQuality(photo: PhotoDescriptor): Promise<QualityScoreResult>;
  findDuplicates(photos: PhotoDescriptor[]): Promise<DuplicateGroup[]>;
  pickBest(photos: PhotoDescriptor[], n: number): Promise<BestPhotosResult>;
  suggestLayout(photos: PhotoDescriptor[], product: { id: string; minPhotos: number; maxPhotos: number }): Promise<LayoutSuggestionResult>;
  describe(photo: PhotoDescriptor, issue: string): Promise<PhotoIssueDescription>;
}
