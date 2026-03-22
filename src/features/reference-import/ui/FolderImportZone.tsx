import { useRef, useState, useCallback } from 'react';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { analyzeAllSectionReferences } from '../api/reference-analysis-service';
import { BACKEND_URL, SECTION_TYPE_LABELS } from '@/shared/config/constants';
import type { SectionType, SectionReferenceFolder } from '@/shared/types';

// 섹션 타입 표시 순서 (상세페이지 흐름 기준)
const SECTION_TYPE_ORDER: SectionType[] = [
  'hero', 'point', 'comparison', 'flavor', 'closeup',
  'lifestyle', 'product-cut', 'sizzle', 'impact-typo', 'lineup',
  'empathy', 'cta', 'recipe', 'trust', 'spec',
  'bundle', 'divider', 'situation', 'review', 'faq',
];

const VALID_SECTION_TYPES: SectionType[] = SECTION_TYPE_ORDER;

// SECTION_TYPE_LABELS는 @/shared/config/constants에서 import

// 한글 폴더명 → SectionType 매핑 (public/source/ 폴더 구조 지원)
const KOREAN_FOLDER_MAP: Record<string, SectionType> = {
  '히어로': 'hero',
  '메인비주얼': 'hero',
  '히어로-메인비주얼': 'hero',
  '제품특징': 'point',
  '제품특징-usp': 'point',
  'usp': 'point',
  '비교': 'comparison',
  '차별화': 'comparison',
  '비교-차별화': 'comparison',
  '맛': 'flavor',
  '플레이버소개': 'flavor',
  '맛-플레이버소개': 'flavor',
  '원재료': 'closeup',
  '클로즈업': 'closeup',
  '원재료-클로즈업': 'closeup',
  '라이프스타일': 'lifestyle',
  '연출컷': 'lifestyle',
  '라이프스타일-연출컷': 'lifestyle',
  '제품': 'product-cut',
  '단독컷': 'product-cut',
  '제품-단독컷': 'product-cut',
  '단면': 'sizzle',
  '씨즐컷': 'sizzle',
  '단면-씨즐컷': 'sizzle',
  '브랜딩': 'impact-typo',
  '제품-라인업': 'lineup',
  '라인업': 'lineup',
  '공감': 'empathy',
  '타겟추천': 'empathy',
  '공감-타겟추천': 'empathy',
  'cta': 'cta',
  '솔루션': 'cta',
  'cta-솔루션': 'cta',
  '레시피': 'recipe',
  '섭취방법': 'recipe',
  '레시피-섭취방법': 'recipe',
  '인증': 'trust',
  '신뢰': 'trust',
  '인증-신뢰': 'trust',
  '제품스펙': 'spec',
  '패키지': 'spec',
  '제품스펙-패키지': 'spec',
};

/** 폴더명에서 SectionType 추출 (영문 직접 매칭 + 한글 매핑 + 번호 prefix 제거) */
function resolveSectionType(folderName: string): SectionType | null {
  const lower = folderName.toLowerCase();

  // 영문 직접 매칭
  if (VALID_SECTION_TYPES.includes(lower as SectionType)) {
    return lower as SectionType;
  }

  // 번호 prefix 제거 (예: "01_히어로-메인비주얼" → "히어로-메인비주얼")
  const stripped = folderName.replace(/^\d+[_\-.\s]*/, '').toLowerCase();

  // 한글 매핑 (전체 매칭)
  if (KOREAN_FOLDER_MAP[stripped]) {
    return KOREAN_FOLDER_MAP[stripped];
  }

  // 부분 매칭: 폴더명에 키워드가 포함되어 있는지 확인
  for (const [keyword, sectionType] of Object.entries(KOREAN_FOLDER_MAP)) {
    if (stripped.includes(keyword)) {
      return sectionType;
    }
  }

  return null;
}

const MAX_PER_SECTION = 30;

/** 이미지 URL → base64 data URL 변환 */
async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * 폴더 임포트 영역
 * - webkitdirectory로 로컬 폴더 임포트
 * - public/references/manifest.json에서 내장 레퍼런스 로드
 */
export function FolderImportZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [loadingBuiltIn, setLoadingBuiltIn] = useState(false);

  const {
    sectionRefFolders,
    setSectionRefFolders,
    setSectionDirectives,
    isAnalyzingRefs,
    setIsAnalyzingRefs,
    refAnalysisProgress,
    setRefAnalysisProgress,
    useBackend,
    geminiApiKey,
  } = useImageStore();

  const showToast = useToastStore((s) => s.showToast);

  const importedTypes = SECTION_TYPE_ORDER.filter(
    (k) => sectionRefFolders[k]?.images?.length > 0
  );
  const totalImported = importedTypes.reduce(
    (sum, k) => sum + sectionRefFolders[k].images.length, 0
  );

  // ===== 로컬 폴더 임포트 =====
  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);

    try {
      const bySection: Record<string, File[]> = {};

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        const parts = file.webkitRelativePath.split('/');
        const subfolder = parts.length >= 2 ? parts[parts.length - 2] : null;

        if (subfolder) {
          const sectionType = resolveSectionType(subfolder);
          if (sectionType) {
            if (!bySection[sectionType]) bySection[sectionType] = [];
            if (bySection[sectionType].length < MAX_PER_SECTION) {
              bySection[sectionType].push(file);
            }
          } else {
            console.warn(`[FolderImport] 매칭 실패 폴더: "${subfolder}" (path: ${file.webkitRelativePath})`);
          }
        }
      }

      if (Object.keys(bySection).length === 0) {
        const validTypes = Object.keys(SECTION_TYPE_LABELS).join(', ');
        showToast(
          `유효한 섹션 폴더를 찾지 못했습니다. 폴더 이름을 확인하세요 (${validTypes})`,
          'error'
        );
        return;
      }

      const folders: Record<string, SectionReferenceFolder> = {};

      for (const [sectionType, sectionFiles] of Object.entries(bySection)) {
        const images: string[] = [];
        for (const file of sectionFiles) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });
          images.push(dataUrl);
        }
        folders[sectionType] = {
          sectionType: sectionType as SectionType,
          images,
        };
      }

      setSectionRefFolders(folders);

      const typeCount = Object.keys(folders).length;
      const imgCount = Object.values(folders).reduce((s, f) => s + f.images.length, 0);
      showToast(`${typeCount}개 섹션 타입, 총 ${imgCount}장 임포트 완료!`, 'success');
    } catch (err) {
      showToast(`임포트 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, 'error');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [setSectionRefFolders, showToast]);

  // ===== 내장 레퍼런스 로드 (public/references/) =====
  const handleLoadBuiltIn = useCallback(async () => {
    setLoadingBuiltIn(true);

    try {
      const res = await fetch('/references/manifest.json');
      if (!res.ok) {
        showToast('manifest.json을 찾을 수 없습니다.', 'error');
        return;
      }
      const manifest: Record<string, string[]> = await res.json();

      const folders: Record<string, SectionReferenceFolder> = {};
      let totalCount = 0;

      for (const [sectionType, fileNames] of Object.entries(manifest)) {
        if (!VALID_SECTION_TYPES.includes(sectionType as SectionType)) continue;
        if (fileNames.length === 0) continue;

        const images: string[] = [];
        for (const fileName of fileNames.slice(0, MAX_PER_SECTION)) {
          try {
            const dataUrl = await urlToDataUrl(`/references/${sectionType}/${fileName}`);
            images.push(dataUrl);
          } catch {
            console.warn(`Failed to load /references/${sectionType}/${fileName}`);
          }
        }

        if (images.length > 0) {
          folders[sectionType] = {
            sectionType: sectionType as SectionType,
            images,
          };
          totalCount += images.length;
        }
      }

      if (totalCount === 0) {
        showToast('내장 레퍼런스가 없습니다. public/references/ 폴더에 이미지를 추가하세요.', 'info');
        return;
      }

      setSectionRefFolders(folders);
      showToast(`${Object.keys(folders).length}개 섹션, 총 ${totalCount}장 내장 레퍼런스 로드!`, 'success');
    } catch (err) {
      showToast(`로드 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, 'error');
    } finally {
      setLoadingBuiltIn(false);
    }
  }, [setSectionRefFolders, showToast]);

  // ===== 분석 시작 =====
  const handleAnalyze = useCallback(async () => {
    if (!useBackend && !geminiApiKey) {
      showToast('API 키를 설정해주세요.', 'error');
      return;
    }

    setIsAnalyzingRefs(true);
    setRefAnalysisProgress({ current: 0, total: 0, currentSection: null });

    try {
      const analysisResult = await analyzeAllSectionReferences(
        sectionRefFolders,
        { useBackend, backendUrl: BACKEND_URL, geminiApiKey },
        (current, total, sectionType) => {
          setRefAnalysisProgress({ current, total, currentSection: sectionType });
        }
      );

      setSectionDirectives(analysisResult.directives);

      setSectionRefFolders((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(analysisResult.directives)) {
          if (updated[key]) {
            updated[key] = {
              ...updated[key],
              analyzedAt: Date.now(),
              imageDescriptions: analysisResult.imageDescriptions[key] || [],
              imageRatios: analysisResult.imageRatios[key] || [],
            };
          }
        }
        return updated;
      });

      showToast(`${Object.keys(analysisResult.directives).length}개 섹션 디자인 디렉티브 생성 완료!`, 'success');
    } catch (err) {
      showToast(`분석 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, 'error');
    } finally {
      setIsAnalyzingRefs(false);
    }
  }, [
    sectionRefFolders, useBackend, geminiApiKey,
    setIsAnalyzingRefs, setRefAnalysisProgress,
    setSectionDirectives, setSectionRefFolders, showToast,
  ]);

  const handleClear = useCallback(() => {
    setSectionRefFolders({});
    setSectionDirectives({});
    showToast('레퍼런스 초기화됨', 'info');
  }, [setSectionRefFolders, setSectionDirectives, showToast]);

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[24px] overflow-hidden mb-6">
      {/* 헤더 */}
      <div className="px-6 py-[18px] border-b border-border-subtle flex justify-between items-center">
        <h2 className="text-base font-semibold flex items-center gap-2.5">
          <span>&#x1F4C2;</span> 섹션별 레퍼런스 임포트
        </h2>
        <span className="px-2.5 py-1 bg-[rgba(139,92,246,0.1)] text-accent-gemini rounded-full text-[0.7rem]">
          선택
        </span>
      </div>

      {/* 바디 */}
      <div className="p-6">
        {/* 폴더 구조 안내 */}
        <div className="mb-4 p-3 bg-bg-tertiary rounded-[12px] text-[0.8rem] text-text-secondary">
          <p className="font-medium mb-2">한글 또는 영문 폴더명으로 섹션별 레퍼런스를 정리하세요:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-[0.72rem] text-text-tertiary mb-2">
            <span><b>01_히어로-메인비주얼</b> → 히어로</span>
            <span><b>02_제품특징-USP</b> → 포인트</span>
            <span><b>03_비교-차별화</b> → 비교</span>
            <span><b>04_맛-플레이버소개</b> → 맛/플레이버</span>
            <span><b>05_원재료-클로즈업</b> → 원재료 클로즈업</span>
            <span><b>06_라이프스타일-연출컷</b> → 라이프스타일</span>
            <span><b>07_제품-단독컷</b> → 제품 단독컷</span>
            <span><b>08_단면-씨즐컷</b> → 씨즐컷</span>
            <span><b>09_브랜딩</b> → 임팩트 타이포</span>
            <span><b>10_제품-라인업</b> → 제품 라인업</span>
            <span><b>11_공감-타겟추천</b> → 공감</span>
            <span><b>12_CTA-솔루션</b> → CTA</span>
            <span><b>13_레시피-섭취방법</b> → 사용법/레시피</span>
            <span><b>14_인증-신뢰</b> → 신뢰/인증</span>
            <span><b>15_제품스펙-패키지</b> → 제품 정보</span>
          </div>
          <p className="text-[0.7rem] text-text-quaternary">
            각 폴더에 1~20장 | 영문 폴더명(hero, point, comparison 등)도 지원 | 분석 후 디자인 디렉티브로 종합
          </p>
        </div>

        {/* 임포트 버튼들 */}
        <div className="flex gap-3 flex-wrap">
          {/* 로컬 폴더 선택 */}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={importing || isAnalyzingRefs}
            className={`
              flex-1 min-w-[180px] py-3 px-4 border-2 border-dashed border-border-default rounded-[12px]
              text-text-secondary text-sm cursor-pointer
              transition-all duration-150
              hover:border-accent-gemini hover:bg-[rgba(139,92,246,0.05)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {importing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-accent-gemini/30 border-t-accent-gemini rounded-full animate-spin" />
                임포트 중...
              </span>
            ) : (
              <>&#x1F4C1; 로컬 폴더 선택</>
            )}
          </button>

          {/* 내장 레퍼런스 로드 */}
          <button
            onClick={handleLoadBuiltIn}
            disabled={loadingBuiltIn || isAnalyzingRefs}
            className={`
              flex-1 min-w-[180px] py-3 px-4 border-2 border-dashed border-border-default rounded-[12px]
              text-text-secondary text-sm cursor-pointer
              transition-all duration-150
              hover:border-accent-primary hover:bg-[rgba(99,102,241,0.05)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {loadingBuiltIn ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                로드 중...
              </span>
            ) : (
              <>&#x1F4E6; 내장 레퍼런스 로드</>
            )}
          </button>

          {totalImported > 0 && (
            <button
              onClick={handleClear}
              disabled={isAnalyzingRefs}
              className="py-3 px-4 border border-border-subtle rounded-[12px] text-text-tertiary text-sm hover:text-red-400 hover:border-red-400/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              초기화
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          // @ts-expect-error webkitdirectory is not in standard HTML spec
          webkitdirectory=""
          directory=""
          multiple
          hidden
          onChange={handleFolderSelect}
        />

        {/* 임포트 결과 요약 */}
        {totalImported > 0 && (
          <div className="mt-4">
            {/* 분석 상태 요약 바 */}
            {(() => {
              const analyzedCount = importedTypes.filter((t) => sectionRefFolders[t]?.analyzedAt).length;
              const totalCount = importedTypes.length;
              const allAnalyzed = analyzedCount === totalCount;
              return (
                <div className={`
                  mb-3 px-4 py-2.5 rounded-[10px] flex items-center justify-between text-[0.8rem]
                  ${allAnalyzed
                    ? 'bg-[rgba(16,185,129,0.1)] border border-accent-success/30'
                    : analyzedCount > 0
                      ? 'bg-[rgba(251,191,36,0.1)] border border-yellow-500/30'
                      : 'bg-[rgba(239,68,68,0.08)] border border-red-500/20'
                  }
                `}>
                  <span className={`font-medium ${allAnalyzed ? 'text-accent-success' : analyzedCount > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {allAnalyzed
                      ? '분석 완료'
                      : analyzedCount > 0
                        ? '부분 분석됨'
                        : '미분석'
                    }
                  </span>
                  <span className="text-text-tertiary">
                    {analyzedCount}/{totalCount}개 섹션 분석됨 &middot; 총 {totalImported}장
                  </span>
                </div>
              );
            })()}

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {importedTypes.map((type) => {
                const folder = sectionRefFolders[type];
                const label = SECTION_TYPE_LABELS[type as SectionType] || type;
                const isAnalyzed = !!folder.analyzedAt;
                return (
                  <div
                    key={type}
                    className={`
                      p-2.5 rounded-[10px] border text-center text-[0.8rem] relative
                      ${isAnalyzed
                        ? 'border-accent-success bg-[rgba(16,185,129,0.08)] text-accent-success'
                        : 'border-border-subtle bg-bg-tertiary text-text-secondary'
                      }
                    `}
                  >
                    {isAnalyzed && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent-success rounded-full flex items-center justify-center text-[0.6rem] text-white font-bold">
                        &#x2713;
                      </span>
                    )}
                    <div className="font-medium">{label}</div>
                    <div className={`text-[0.7rem] mt-0.5 ${isAnalyzed ? 'text-accent-success/70' : 'text-text-tertiary'}`}>
                      {folder.images.length}장
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 분석 진행 상태 표시 */}
            {isAnalyzingRefs && (
              <div className="mt-3 p-3 bg-[rgba(139,92,246,0.08)] border border-accent-gemini/20 rounded-[12px]">
                <div className="flex items-center justify-between text-[0.8rem] mb-2">
                  <span className="text-accent-gemini font-medium animate-pulse">
                    레퍼런스 분석 중...
                  </span>
                  <span className="text-text-tertiary">
                    {refAnalysisProgress.total > 0
                      ? `${refAnalysisProgress.current} / ${refAnalysisProgress.total}`
                      : '준비 중'}
                  </span>
                </div>
                {refAnalysisProgress.total > 0 && (
                  <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(refAnalysisProgress.current / refAnalysisProgress.total) * 100}%`,
                        background: 'linear-gradient(90deg, var(--accent-gemini), var(--accent-primary))',
                      }}
                    />
                  </div>
                )}
                {refAnalysisProgress.currentSection && (
                  <div className="text-[0.75rem] text-text-secondary">
                    현재 분석: <span className="text-accent-gemini font-medium">{SECTION_TYPE_LABELS[refAnalysisProgress.currentSection] || refAnalysisProgress.currentSection}</span>
                  </div>
                )}
              </div>
            )}

            {/* 분석 버튼 */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzingRefs || (!useBackend && !geminiApiKey)}
              className={`
                w-full mt-4 py-3 px-4 border-none rounded-[12px] text-white font-semibold text-[0.9rem]
                cursor-pointer flex items-center justify-center gap-2
                transition-all duration-250
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:enabled:-translate-y-0.5
              `}
              style={{
                background: 'linear-gradient(135deg, var(--accent-gemini), var(--accent-primary))',
                boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
              }}
            >
              {isAnalyzingRefs ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {refAnalysisProgress.currentSection
                    ? `분석 중... ${refAnalysisProgress.current}/${refAnalysisProgress.total} (${SECTION_TYPE_LABELS[refAnalysisProgress.currentSection] || refAnalysisProgress.currentSection})`
                    : '분석 준비 중...'
                  }
                </>
              ) : (
                <>&#x1F9E0; 레퍼런스 분석 시작 ({totalImported}장 &#x2192; 디자인 디렉티브)</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
