import {
  PhotoAnalyzer,
  PhotoDescriptor,
  QualityScoreResult,
  DuplicateGroup,
  BestPhotosResult,
  LayoutSuggestionResult,
  PhotoIssueDescription
} from './types';

/**
 * Deterministic Mock Implementation of PhotoAnalyzer
 * Used as default provider for offline, testing, and zero-cost operation.
 */
export class MockPhotoAnalyzer implements PhotoAnalyzer {
  async scoreQuality(photo: PhotoDescriptor): Promise<QualityScoreResult> {
    const isLowRes = Boolean(photo.width && photo.height && (photo.width < 1200 || photo.height < 1200));
    const score = isLowRes ? 58 : 92;
    const warnings: string[] = [];

    if (isLowRes) {
      warnings.push('Разрешение фото ниже рекомендуемого (1200×1600 px). На печати возможна потеря чёткости.');
    }

    return {
      score,
      isBlurry: false,
      blurVariance: 180.5,
      isLowResolution: isLowRes,
      warnings
    };
  }

  async findDuplicates(photos: PhotoDescriptor[]): Promise<DuplicateGroup[]> {
    if (photos.length < 2) return [];

    // Deterministic duplicate check based on photo IDs or filenames
    const duplicates: DuplicateGroup[] = [];
    const seenNames = new Map<string, string>();

    for (const photo of photos) {
      const baseName = (photo.filePath || photo.id).split('/').pop()?.split('.')[0] || photo.id;
      if (seenNames.has(baseName)) {
        duplicates.push({
          originalPhotoId: seenNames.get(baseName)!,
          duplicatePhotoIds: [photo.id],
          similarityScore: 0.95,
          recommendation: 'Обнаружен дубликат или похожий снимок из серии. Рекомендуется оставить один лучший кадр.'
        });
      } else {
        seenNames.set(baseName, photo.id);
      }
    }

    return duplicates;
  }

  async pickBest(photos: PhotoDescriptor[], n: number): Promise<BestPhotosResult> {
    const count = Math.min(n, photos.length);
    const selectedPhotoIds = photos.slice(0, count).map(p => p.id);

    return {
      selectedPhotoIds,
      rationale: `Отобрано ${selectedPhotoIds.length} наиболее чётких и сбалансированных фотографий с приоритетом разнообразия композиций.`
    };
  }

  async suggestLayout(
    photos: PhotoDescriptor[],
    product: { id: string; minPhotos: number; maxPhotos: number }
  ): Promise<LayoutSuggestionResult> {
    const slots = photos.slice(0, product.maxPhotos).map((photo, index) => ({
      slotIndex: index,
      pageNumber: Math.floor(index / 2) + 1,
      suggestedPhotoId: photo.id,
      caption: `Страница ${Math.floor(index / 2) + 1}, фото ${index + 1}`
    }));

    return {
      productId: product.id,
      layoutName: 'Автораскладка по хронологии',
      slots,
      tips: [
        'Фотографии расположены в хронологическом порядке съёмки.',
        'Обложка выбрана из самого чёткого снимка с высоким разрешением.'
      ]
    };
  }

  async describe(photo: PhotoDescriptor, issue: string): Promise<PhotoIssueDescription> {
    return {
      photoId: photo.id,
      issueType: issue === 'blur' ? 'blur' : issue === 'duplicate' ? 'duplicate' : 'low_res',
      severity: 'warning',
      titleRu: 'Рекомендация по качеству фото',
      descriptionRu: 'Снимок имеет небольшое разрешение или размытость при сильном увеличении.',
      recommendedActionRu: 'Вы можете заменить снимок на оригинал без сжатия в мессенджерах либо продолжить печать.'
    };
  }
}
